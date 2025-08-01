import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/jest';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { mockCall, mockApi } from 'app/core/testing/utils/mock-api.utils';
import { mockAuth } from 'app/core/testing/utils/mock-auth.utils';
import { IscsiExtent } from 'app/interfaces/iscsi.interface';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { EmptyService } from 'app/modules/empty/empty.service';
import { SearchInput1Component } from 'app/modules/forms/search-input1/search-input1.component';
import { IxTableHarness } from 'app/modules/ix-table/components/ix-table/ix-table.harness';
import {
  IxTableColumnsSelectorComponent,
} from 'app/modules/ix-table/components/ix-table-columns-selector/ix-table-columns-selector.component';
import { FakeProgressBarComponent } from 'app/modules/loader/components/fake-progress-bar/fake-progress-bar.component';
import { SlideIn } from 'app/modules/slide-ins/slide-in';
import { SlideInRef } from 'app/modules/slide-ins/slide-in-ref';
import { ExtentFormComponent } from 'app/pages/sharing/iscsi/extent/extent-form/extent-form.component';
import { DeleteExtentDialog } from 'app/pages/sharing/iscsi/extent/extent-list/delete-extent-dialog/delete-extent-dialog.component';
import { ExtentListComponent } from 'app/pages/sharing/iscsi/extent/extent-list/extent-list.component';
import { selectPreferences } from 'app/store/preferences/preferences.selectors';

const extents: IscsiExtent[] = [
  {
    id: 1,
    name: 'test-iscsi-extent',
    path: '/dev/zvol/tank/iscsi-extent',
    comment: 'test-iscsi-extent-comment',
    serial: 'test-iscsi-extent-serial',
    product_id: 'test-product-id',
    enabled: true,
    naa: '0x6589cfc00000097bd2aa6aff515d84c9',
  } as IscsiExtent,
];

describe('ExtentListComponent', () => {
  let spectator: Spectator<ExtentListComponent>;
  let loader: HarnessLoader;
  let table: IxTableHarness;

  const slideInRef: SlideInRef<undefined, unknown> = {
    close: jest.fn(),
    requireConfirmationWhen: jest.fn(),
    getData: jest.fn((): undefined => undefined),
  };

  const createComponent = createComponentFactory({
    component: ExtentListComponent,
    imports: [
      SearchInput1Component,
      IxTableColumnsSelectorComponent,
      FakeProgressBarComponent,
    ],
    providers: [
      mockProvider(EmptyService),
      mockApi([
        mockCall('iscsi.extent.query', extents),
        mockCall('iscsi.extent.delete'),
      ]),
      mockProvider(SlideInRef, slideInRef),
      mockProvider(DialogService, {
        confirm: jest.fn(() => of(true)),
      }),
      mockProvider(SlideIn, {
        open: jest.fn(() => of()),
      }),
      mockProvider(MatDialog, {
        open: jest.fn(() => ({
          afterClosed: jest.fn(() => of(null)),
        })),
      }),
      provideMockStore({
        selectors: [
          {
            selector: selectPreferences,
            value: {},
          },
        ],
      }),
      mockAuth(),
    ],
  });

  beforeEach(async () => {
    spectator = createComponent();
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
    table = await loader.getHarness(IxTableHarness);
  });

  it('shows acurate page title', () => {
    const title = spectator.query('h3');
    expect(title).toHaveText('Extents');
  });

  it('opens extent form when "Add" button is pressed', async () => {
    const addButton = await loader.getHarness(MatButtonHarness.with({ text: 'Add' }));
    await addButton.click();

    expect(spectator.inject(SlideIn).open).toHaveBeenCalledWith(ExtentFormComponent, { wide: true });
  });

  it('opens extent form when "Edit" button is pressed', async () => {
    const [menu] = await loader.getAllHarnesses(MatMenuHarness.with({ selector: '[mat-icon-button]' }));
    await menu.open();
    await menu.clickItem({ text: 'Edit' });

    expect(spectator.inject(SlideIn).open).toHaveBeenCalledWith(ExtentFormComponent, {
      data: extents[0],
      wide: true,
    });
  });

  it('opens delete dialog when "Delete" button is pressed', async () => {
    const [menu] = await loader.getAllHarnesses(MatMenuHarness.with({ selector: '[mat-icon-button]' }));
    await menu.open();
    await menu.clickItem({ text: 'Delete' });

    expect(spectator.inject(MatDialog).open).toHaveBeenCalledWith(DeleteExtentDialog, {
      data: extents[0],
    });
  });

  it('should show table rows', async () => {
    const expectedRows = [
      ['Extent Name', 'Device/File', 'Description', 'Serial', 'Product ID', 'NAA', 'Enabled', ''],
      [
        'test-iscsi-extent',
        '/dev/zvol/tank/iscsi-extent',
        'test-iscsi-extent-comment',
        'test-iscsi-extent-serial',
        'test-product-id',
        '0x6589cfc00000097bd2aa6aff515d84c9',
        'Yes',
        '',
      ],
    ];

    const cells = await table.getCellTexts();
    expect(cells).toEqual(expectedRows);
  });
});
