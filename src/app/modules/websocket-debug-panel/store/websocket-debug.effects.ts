import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  tap, switchMap, withLatestFrom,
} from 'rxjs/operators';
import { exportFilePrefix, storageKeys } from 'app/modules/websocket-debug-panel/constants';
import { MockConfig } from 'app/modules/websocket-debug-panel/interfaces/mock-config.interface';
import { safeGetItem, safeSetItem } from 'app/modules/websocket-debug-panel/utils/local-storage-utils';
import * as WebSocketDebugActions from './websocket-debug.actions';
import { selectMockConfigs, selectIsPanelOpen } from './websocket-debug.selectors';

@Injectable()
export class WebSocketDebugEffects {
  loadMockConfigs$ = createEffect(() => this.actions$.pipe(
    ofType(WebSocketDebugActions.loadMockConfigs),
    switchMap(() => {
      const configs = safeGetItem<MockConfig[]>(storageKeys.MOCK_CONFIGS, []);
      return [WebSocketDebugActions.mockConfigsLoaded({ configs })];
    }),
  ));

  saveMockConfigs$ = createEffect(() => this.actions$.pipe(
    ofType(
      WebSocketDebugActions.addMockConfig,
      WebSocketDebugActions.updateMockConfig,
      WebSocketDebugActions.deleteMockConfig,
      WebSocketDebugActions.toggleMockConfig,
      WebSocketDebugActions.saveMockConfigs,
    ),
    withLatestFrom(this.store$.select(selectMockConfigs)),
    tap(([, configs]) => {
      safeSetItem(storageKeys.MOCK_CONFIGS, configs);
    }),
  ), { dispatch: false });

  persistPanelState$ = createEffect(() => this.actions$.pipe(
    ofType(WebSocketDebugActions.setPanelOpen, WebSocketDebugActions.togglePanel),
    withLatestFrom(this.store$.select(selectIsPanelOpen)),
    tap(([, isPanelOpen]) => {
      safeSetItem(storageKeys.PANEL_OPEN, isPanelOpen);
    }),
  ), { dispatch: false });

  exportMockConfigs$ = createEffect(() => this.actions$.pipe(
    ofType(WebSocketDebugActions.exportMockConfigs),
    withLatestFrom(this.store$.select(selectMockConfigs)),
    tap(([, configs]) => {
      const dataStr = JSON.stringify(configs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `${exportFilePrefix}-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }),
  ), { dispatch: false });

  constructor(
    private actions$: Actions,
    private store$: Store,
  ) {}
}
