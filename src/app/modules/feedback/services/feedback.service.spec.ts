import { HttpClient, HttpResponse } from '@angular/common/http';
import {
  createServiceFactory,
  mockProvider,
  SpectatorService,
} from '@ngneat/spectator/jest';
import { provideMockStore } from '@ngrx/store/testing';
import { lastValueFrom, of } from 'rxjs';
import { fakeFile } from 'app/core/testing/utils/fake-file.uitls';
import { fakeSuccessfulJob } from 'app/core/testing/utils/fake-job.utils';
import { mockCall, mockJob, mockApi } from 'app/core/testing/utils/mock-api.utils';
import { mockWindow } from 'app/core/testing/utils/mock-window.utils';
import {
  TicketCategory, TicketCriticality, TicketEnvironment, TicketType,
} from 'app/enums/file-ticket.enum';
import { ProductType } from 'app/enums/product-type.enum';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { FeedbackService } from 'app/modules/feedback/services/feedback.service';
import { SnackbarService } from 'app/modules/snackbar/services/snackbar.service';
import { ApiService } from 'app/modules/websocket/api.service';
import { SentryConfigurationService } from 'app/services/errors/sentry-configuration.service';
import { SystemGeneralService } from 'app/services/system-general.service';
import { UploadService } from 'app/services/upload.service';
import { SystemInfoState } from 'app/store/system-info/system-info.reducer';
import { selectProductType, selectSystemInfoState } from 'app/store/system-info/system-info.selectors';

describe('FeedbackService', () => {
  let spectator: SpectatorService<FeedbackService>;
  let fileUploadService: UploadService;

  const newTicket = {
    ticket: 1,
    url: 'https://jira-redirect.ixsystems.com/ticket',
    has_debug: false,
  };

  const newReview = {
    review_id: 2,
    success: true,
  };

  const createService = createServiceFactory({
    service: FeedbackService,
    providers: [
      mockApi([
        mockJob('support.new_ticket', fakeSuccessfulJob(newTicket)),
        mockCall('system.host_id', 'testHostId'),
      ]),
      provideMockStore({
        selectors: [
          {
            selector: selectProductType,
            value: ProductType.Enterprise,
          },
          {
            selector: selectSystemInfoState,
            value: {
              systemInfo: {
                version: 'SCALE-24.04',
                system_product: 'M40',
              },
              isIxHardware: true,
            } as SystemInfoState,
          },
        ],
      }),
      mockProvider(HttpClient, {
        post: jest.fn(() => of(newReview)),
      }),
      mockProvider(SentryConfigurationService, {
        sessionId$: of('testSessionId'),
      }),
      mockProvider(SnackbarService),
      mockProvider(UploadService, {
        upload: jest.fn(() => of(new HttpResponse({ status: 200 }))),
      }),
      mockProvider(SystemGeneralService, {
        getProductType: jest.fn(() => ProductType.Enterprise),
      }),
      mockProvider(DialogService, {
        generalDialog: jest.fn(() => of(true)),
      }),
      mockWindow({
        location: {
          pathname: '/storage',
        },
        navigator: {
          userAgent: 'Safari',
        },
      }),
    ],
  });

  beforeEach(() => {
    spectator = createService();
    fileUploadService = spectator.inject(UploadService);
  });

  describe('addDebugInfoToMessage', () => {
    it('appends sentry session id to the error message', async () => {
      const message = 'test message';
      const messageWithDebug = await lastValueFrom(spectator.service.addDebugInfoToMessage(message));

      expect(messageWithDebug).toBe('test message\n'
        + '\n'
        + 'Session ID: testSessionId');
    });
  });

  describe('createTicket', () => {
    const fakeScreenshot = fakeFile('screenshot.png');
    const file1 = fakeFile('file1.png');
    const file2 = fakeFile('file2.png');

    beforeEach(() => {
      jest.spyOn(spectator.service, 'takeScreenshot').mockReturnValue(of(fakeScreenshot));
    });

    it('completes when not attachments are required and no screenshots were added', async () => {
      const data = {
        attach_debug: true,
        attach_images: true,
        images: [] as File[],
        message: 'Help me',
        take_screenshot: false,
        title: 'Cannot shutdown',
      };

      const response = await lastValueFrom(spectator.service.createTicket('test-token', TicketType.Bug, data));
      expect(spectator.inject(ApiService).job).toHaveBeenCalledWith('support.new_ticket', [{
        attach_debug: true,
        body: 'Help me\n\nSession ID: testSessionId',
        title: 'Cannot shutdown',
        token: 'test-token',
        type: TicketType.Bug,
      }]);
      expect(response).toEqual(newTicket);

      expect(spectator.service.takeScreenshot).not.toHaveBeenCalled();
    });

    it('takes a screenshot when it has been requested and attaches it to ticket', async () => {
      const data = {
        attach_debug: true,
        attach_images: true,
        images: [] as File[],
        message: 'Help me',
        take_screenshot: true,
        title: 'Cannot shutdown',
      };

      const response = await lastValueFrom(spectator.service.createTicket('test-token', TicketType.Bug, data));
      expect(spectator.inject(ApiService).job).toHaveBeenCalledWith('support.new_ticket', [{
        attach_debug: true,
        body: 'Help me\n\nSession ID: testSessionId',
        title: 'Cannot shutdown',
        token: 'test-token',
        type: TicketType.Bug,
      }]);
      expect(response).toEqual(newTicket);

      expect(spectator.service.takeScreenshot).toHaveBeenCalled();
      expect(fileUploadService.upload).toHaveBeenCalledWith(expect.objectContaining({
        file: fakeScreenshot,
        method: 'support.attach_ticket',
        params: [{
          token: 'test-token',
          ticket: 1,
          filename: 'screenshot.png',
        }],
      }));
    });

    it('takes a screenshot and uploads attachments', async () => {
      const data = {
        attach_debug: false,
        attach_images: true,
        images: [file1, file2],
        message: 'test msg',
        take_screenshot: true,
        title: 'test title',
      };

      const response = await lastValueFrom(spectator.service.createTicket('test-token', TicketType.Suggestion, data));
      expect(spectator.inject(ApiService).job).toHaveBeenCalledWith('support.new_ticket', [{
        attach_debug: false,
        body: 'test msg\n\nSession ID: testSessionId',
        title: 'test title',
        token: 'test-token',
        type: TicketType.Suggestion,
      }]);
      expect(response).toEqual(newTicket);

      expect(spectator.service.takeScreenshot).toHaveBeenCalled();

      expect(fileUploadService.upload).toHaveBeenCalledTimes(3);
      expect(fileUploadService.upload).toHaveBeenCalledWith(expect.objectContaining({
        file: fakeScreenshot,
        method: 'support.attach_ticket',
        params: [{
          token: 'test-token',
          ticket: 1,
          filename: 'screenshot.png',
        }],
      }));
      expect(fileUploadService.upload).toHaveBeenCalledWith(expect.objectContaining({
        file: file1,
        method: 'support.attach_ticket',
        params: [{
          token: 'test-token',
          ticket: 1,
          filename: 'file1.png',
        }],
      }));
      expect(fileUploadService.upload).toHaveBeenCalledWith(expect.objectContaining({
        file: file2,
        method: 'support.attach_ticket',
        params: [{
          token: 'test-token',
          ticket: 1,
          filename: 'file2.png',
        }],
      }));
    });
  });

  describe('createTicketLicensed', () => {
    const fakeScreenshot = fakeFile('screenshot.png');

    beforeEach(() => {
      jest.spyOn(spectator.service, 'takeScreenshot').mockReturnValue(of(fakeScreenshot));
    });

    it('completes when not attachments are required and no screenshots were added', async () => {
      const data = {
        attach_debug: true,
        attach_images: true,
        category: TicketCategory.Performance,
        cc: ['marcus@gmail.com'],
        criticality: TicketCriticality.TotalDown,
        email: 'john.wick@gmail.com',
        environment: TicketEnvironment.Staging,
        images: [] as File[],
        message: 'New request',
        name: 'John Wick',
        phone: '310-564-8005',
        take_screenshot: false,
        title: 'Assassination Request',
      };

      const response = await lastValueFrom(spectator.service.createTicketLicensed(data));
      expect(spectator.inject(ApiService).job).toHaveBeenCalledWith('support.new_ticket', [{
        body: 'New request\n\nSession ID: testSessionId',
        attach_debug: true,
        category: TicketCategory.Performance,
        cc: ['marcus@gmail.com'],
        criticality: TicketCriticality.TotalDown,
        email: 'john.wick@gmail.com',
        environment: TicketEnvironment.Staging,
        name: 'John Wick',
        phone: '310-564-8005',
        title: 'Assassination Request',
      }]);
      expect(response).toEqual(newTicket);
      expect(spectator.service.takeScreenshot).not.toHaveBeenCalled();
    });
  });

  describe('createReview', () => {
    const fakeScreenshot = fakeFile('screenshot.png');
    const file1 = fakeFile('file1.png');
    const file2 = fakeFile('file2.png');

    beforeEach(() => {
      jest.spyOn(spectator.service, 'takeScreenshot').mockReturnValue(of(fakeScreenshot));
    });

    it('completes when not attachments are required and no screenshots were added', async () => {
      const data = {
        attach_images: true,
        images: [] as File[],
        message: 'Git gud',
        rating: 1,
        take_screenshot: false,
      };

      expect(await lastValueFrom(spectator.service.createReview(data))).toBeUndefined();
      expect(spectator.inject(HttpClient).post).toHaveBeenCalledWith('https://feedback.ui.truenas.com/api/reviews/add/', {
        environment: expect.stringMatching(/(production|development)/i),
        extra: {},
        host_u_id: 'testHostId',
        message: 'Git gud',
        page: '/storage',
        product_model: 'M40',
        product_type: ProductType.Enterprise,
        rating: 1,
        release: 'SCALE-24.04',
        user_agent: 'Safari',
      });
      expect(spectator.service.takeScreenshot).not.toHaveBeenCalled();
    });

    it('takes a screenshot when it has been requested and attaches it to ticket', async () => {
      const data = {
        attach_images: true,
        images: [] as File[],
        message: 'Git gud',
        rating: 1,
        take_screenshot: true,
      };

      expect(await lastValueFrom(spectator.service.createReview(data))).toEqual([newReview]);
      expect(spectator.inject(HttpClient).post).toHaveBeenCalledWith('https://feedback.ui.truenas.com/api/reviews/add/', {
        environment: expect.stringMatching(/(production|development)/i),
        extra: {},
        host_u_id: 'testHostId',
        message: 'Git gud',
        page: '/storage',
        product_model: 'M40',
        product_type: ProductType.Enterprise,
        rating: 1,
        release: 'SCALE-24.04',
        user_agent: 'Safari',
      });
      expect(spectator.service.takeScreenshot).toHaveBeenCalled();

      const formData = new FormData();
      formData.append('image', fakeScreenshot);

      expect(spectator.inject(HttpClient).post).toHaveBeenCalledWith(
        'https://feedback.ui.truenas.com/api/reviews/2/add-attachment/',
        formData,
      );
    });

    it('takes a screenshot and uploads attachments', async () => {
      const data = {
        attach_images: true,
        images: [file1, file2] as File[],
        message: 'Git gud',
        rating: 5,
        take_screenshot: true,
      };

      await lastValueFrom(spectator.service.createReview(data));

      expect(spectator.inject(HttpClient).post).toHaveBeenCalledWith('https://feedback.ui.truenas.com/api/reviews/add/', {
        environment: expect.stringMatching(/(production|development)/i),
        extra: {},
        host_u_id: 'testHostId',
        message: 'Git gud',
        page: '/storage',
        product_model: 'M40',
        product_type: ProductType.Enterprise,
        rating: 5,
        release: 'SCALE-24.04',
        user_agent: 'Safari',
      });
      expect(spectator.service.takeScreenshot).toHaveBeenCalled();

      const formDataScreenshot = new FormData();
      const formDataFile1 = new FormData();
      const formDataFile2 = new FormData();
      formDataScreenshot.append('image', fakeScreenshot);
      formDataFile1.append('image', file1);
      formDataFile2.append('image', file2);

      const link = 'https://feedback.ui.truenas.com/api/reviews/2/add-attachment/';
      expect(spectator.inject(HttpClient).post).toHaveBeenNthCalledWith(2, link, formDataFile1);
      expect(spectator.inject(HttpClient).post).toHaveBeenNthCalledWith(3, link, formDataFile2);
      expect(spectator.inject(HttpClient).post).toHaveBeenNthCalledWith(4, link, formDataScreenshot);
    });
  });

  describe('showFeedbackSuccessMessage', () => {
    it('opens a snackbar when feedback is submitted', () => {
      spectator.service.showFeedbackSuccessMessage();

      expect(spectator.inject(SnackbarService).success).toHaveBeenCalledWith(
        'Thank you for sharing your feedback with us! Your insights are valuable in helping us improve our product.',
      );
    });
  });

  describe('showTicketSuccessMessage', () => {
    it('opens a dialog with a ticket url when ticket is submitted', () => {
      spectator.service.showTicketSuccessMessage('https://jira-redirect.ixsystems.com/ticket');

      expect(spectator.inject(DialogService).generalDialog).toHaveBeenCalledWith({
        message: 'Thank you. Ticket was submitted successfully.',
        title: 'Ticket Created',
        cancelBtnMsg: 'Close',
        confirmBtnMsg: 'Open ticket',
        icon: 'mdi-check',
      });
    });
  });
});
