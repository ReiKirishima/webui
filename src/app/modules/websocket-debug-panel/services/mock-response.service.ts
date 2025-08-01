import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { environment } from 'environments/environment';
import {
  Observable, Subject, Subscription, timer,
} from 'rxjs';
import { first, take } from 'rxjs/operators';
import { CollectionChangeType } from 'app/enums/api.enum';
import {
  CollectionUpdateMessage, IncomingMessage, RequestMessage, SuccessfulResponse,
} from 'app/interfaces/api-message.interface';
import { WebSocketDebugError } from 'app/modules/websocket-debug-panel/interfaces/error.types';
import {
  MockConfig, MockEvent,
} from 'app/modules/websocket-debug-panel/interfaces/mock-config.interface';
import { selectEnabledMockConfigs } from 'app/modules/websocket-debug-panel/store/websocket-debug.selectors';

@Injectable({
  providedIn: 'root',
})
export class MockResponseService implements OnDestroy {
  private readonly mockResponses$ = new Subject<IncomingMessage>();
  private jobIdCounter = 10000;
  private readonly mockedCallIds = new Set<string>();
  private readonly activeEvents = new Map<string, number[]>();
  private readonly eventSubscriptions = new Map<string, Subscription>();
  private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  get responses$(): Observable<IncomingMessage> {
    return this.mockResponses$.asObservable();
  }

  constructor(
    private store$: Store,
  ) {}

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.eventSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.eventSubscriptions.clear();

    // Clean up all timers
    this.cleanupTimers.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.cleanupTimers.clear();

    // Complete the subject
    this.mockResponses$.complete();
  }

  checkMock(message: RequestMessage): MockConfig | null {
    if (!environment.debugPanel?.enabled) {
      return null;
    }

    let enabledMocks: MockConfig[] = [];
    const subscription = this.store$.select(selectEnabledMockConfigs)
      .pipe(first())
      .subscribe((configs) => { enabledMocks = configs; });
    subscription.unsubscribe();

    for (const config of enabledMocks) {
      if (this.matchesConfig(message, config)) {
        return config;
      }
    }

    return null;
  }

  generateMockResponse(message: RequestMessage, config: MockConfig): void {
    this.handleMockResponse(message, config);
  }

  private matchesConfig(message: RequestMessage, config: MockConfig): boolean {
    if (message.method !== config.methodName) {
      return false;
    }

    if (config.messagePattern) {
      try {
        // Validate the regex pattern first
        const regex = new RegExp(config.messagePattern);
        // Safely stringify the message
        let messageStr: string;
        try {
          messageStr = JSON.stringify(message);
        } catch (stringifyError) {
          const error = new WebSocketDebugError(
            `Failed to stringify message for pattern matching: ${stringifyError instanceof Error ? stringifyError.message : 'Unknown error'}`,
            'MESSAGE_STRINGIFY_ERROR',
            stringifyError,
          );
          console.error(error.message, { config: config.id, method: message.method });
          return false;
        }
        return regex.test(messageStr);
      } catch (regexError) {
        const error = new WebSocketDebugError(
          `Invalid regex pattern in mock config: ${config.messagePattern}`,
          'INVALID_REGEX_PATTERN',
          regexError,
        );
        console.error(error.message, { configId: config.id, pattern: config.messagePattern });
        return false;
      }
    }

    return true;
  }

  private handleMockResponse(message: RequestMessage, config: MockConfig): void {
    // Track this as a mocked call response
    this.mockedCallIds.add(message.id);

    const mockResponse: SuccessfulResponse = {
      jsonrpc: '2.0',
      id: message.id,
      result: config.response.result,
    };

    // Apply delay if specified
    const responseDelay = config.response.delay || 0;
    if (responseDelay > 0) {
      const responseSubscription = timer(responseDelay).pipe(take(1)).subscribe(() => {
        this.mockResponses$.next(mockResponse);
      });
      this.eventSubscriptions.set(`${message.id}-response`, responseSubscription);
    } else {
      this.mockResponses$.next(mockResponse);
    }

    // Handle events if present
    if (config.events && config.events.length > 0) {
      this.scheduleEvents(message, config.events);
    }

    // Clean up after a short delay to prevent memory leak
    const cleanupDelay = 5000 + responseDelay + this.getTotalEventDelay(config.events);
    const cleanupTimer = setTimeout(() => {
      this.mockedCallIds.delete(message.id);
      this.activeEvents.delete(message.id);
      this.cleanupEventSubscriptions(message.id);
      this.cleanupTimers.delete(message.id);
    }, cleanupDelay);
    this.cleanupTimers.set(message.id, cleanupTimer);
  }

  private scheduleEvents(message: RequestMessage, events: MockEvent[]): void {
    const eventIds: number[] = [];
    let totalDelay = 0;

    events.forEach((event) => {
      const eventId = this.getNextJobId();
      eventIds.push(eventId);
      totalDelay += event.delay || 0;

      const eventSubscription = timer(totalDelay).pipe(take(1)).subscribe(() => {
        this.emitEvent(message, event, eventId);
      });
      this.eventSubscriptions.set(`${message.id}-event-${eventId}`, eventSubscription);
    });

    this.activeEvents.set(message.id, eventIds);
  }

  private emitEvent(message: RequestMessage, event: MockEvent, eventId: number): void {
    const updateMessage: CollectionUpdateMessage = {
      jsonrpc: '2.0',
      method: 'collection_update',
      params: {
        msg: CollectionChangeType.Changed,
        collection: 'core.get_jobs',
        id: eventId,
        fields: {
          ...event.fields,
          id: event.fields.id || eventId,
          message_ids: event.fields.message_ids || [message.id],
          method: event.fields.method || message.method,
          arguments: event.fields.arguments || message.params,
          transient: event.fields.transient ?? true,
          time_started: event.fields.time_started || { $date: Date.now() },
        },
      },
    };
    this.mockResponses$.next(updateMessage);
  }

  private getNextJobId(): number {
    return ++this.jobIdCounter;
  }

  private getTotalEventDelay(events?: MockEvent[]): number {
    if (!events || events.length === 0) {
      return 0;
    }
    return events.reduce((total, event) => total + (event.delay || 0), 0);
  }

  private cleanupEventSubscriptions(messageId: string): void {
    this.eventSubscriptions.forEach((subscription, key) => {
      if (key.startsWith(messageId)) {
        subscription.unsubscribe();
        this.eventSubscriptions.delete(key);
      }
    });
  }

  isMockedResponse(message: IncomingMessage): boolean {
    // Check if it's a mocked call response
    if ('id' in message && message.id && this.mockedCallIds.has(message.id)) {
      return true;
    }

    // Check if it's a mocked event
    if ('method' in message && message.method === 'collection_update' && 'params' in message) {
      const params = message.params as { fields?: { message_ids?: string[] } };
      if (params?.fields?.message_ids) {
        for (const messageId of params.fields.message_ids) {
          if (this.activeEvents.has(messageId)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
