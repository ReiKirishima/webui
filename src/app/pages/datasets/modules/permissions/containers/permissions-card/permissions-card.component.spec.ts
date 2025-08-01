import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { fakeAsync } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { Router } from '@angular/router';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { MockComponent } from 'ng-mocks';
import { MockApiService } from 'app/core/testing/classes/mock-api.service';
import { mockCall, mockApi } from 'app/core/testing/utils/mock-api.utils';
import { mockAuth } from 'app/core/testing/utils/mock-auth.utils';
import { AclType } from 'app/enums/acl-type.enum';
import { OnOff } from 'app/enums/on-off.enum';
import { YesNo } from 'app/enums/yes-no.enum';
import { ZfsPropertySource } from 'app/enums/zfs-property-source.enum';
import { Acl, NfsAcl, PosixAcl } from 'app/interfaces/acl.interface';
import { DatasetDetails } from 'app/interfaces/dataset.interface';
import { FileSystemStat } from 'app/interfaces/filesystem-stat.interface';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { CastPipe } from 'app/modules/pipes/cast/cast.pipe';
import { ApiService } from 'app/modules/websocket/api.service';
import {
  ViewNfsPermissionsComponent,
} from 'app/pages/datasets/modules/permissions/components/view-nfs-permissions/view-nfs-permissions.component';
import {
  ViewPosixPermissionsComponent,
} from 'app/pages/datasets/modules/permissions/components/view-posix-permissions/view-posix-permissions.component';
import {
  ViewTrivialPermissionsComponent,
} from 'app/pages/datasets/modules/permissions/components/view-trivial-permissions/view-trivial-permissions.component';
import {
  PermissionsCardComponent,
} from 'app/pages/datasets/modules/permissions/containers/permissions-card/permissions-card.component';
import { PermissionsCardStore } from 'app/pages/datasets/modules/permissions/stores/permissions-card.store';

describe('PermissionsCardComponent', () => {
  const stat = {
    user: 'john',
    group: 'johns',
    mode: 16889,
  } as FileSystemStat;

  const dataset = {
    id: 'testpool/dataset',
    name: 'testpool/dataset',
    mountpoint: '/mnt/testpool/dataset',
    mounted: {
      parsed: true,
      rawvalue: 'yes',
      value: YesNo.Yes,
      source: ZfsPropertySource.Local,
    },
    pool: 'testpool',
    readonly: {
      parsed: false,
      rawvalue: 'off',
      value: OnOff.Off,
      source: ZfsPropertySource.Local,
    },
  } as DatasetDetails;

  let spectator: Spectator<PermissionsCardComponent>;
  let loader: HarnessLoader;
  const createComponent = createComponentFactory({
    component: PermissionsCardComponent,
    imports: [
      CastPipe,
    ],
    declarations: [
      MockComponent(ViewPosixPermissionsComponent),
      MockComponent(ViewNfsPermissionsComponent),
      MockComponent(ViewTrivialPermissionsComponent),
    ],
    providers: [
      mockAuth(),
      PermissionsCardStore,
      mockProvider(DialogService),
      mockProvider(Router),
      mockApi([
        mockCall('filesystem.stat', stat),
        mockCall('filesystem.getacl', {
          trivial: true,
        } as Acl),
      ]),
    ],
  });

  beforeEach(() => {
    spectator = createComponent({
      props: { dataset },
    });
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
  });

  it('loads stat and acl for dataset provided in Input', () => {
    const api = spectator.inject(ApiService);

    expect(api.call).toHaveBeenCalledWith('filesystem.stat', ['/mnt/testpool/dataset']);
    expect(api.call).toHaveBeenCalledWith('filesystem.getacl', ['/mnt/testpool/dataset', true, true]);
  });

  it('shows dataset ownership information', () => {
    const ownerItem = spectator.query('.details-item');

    expect(ownerItem.textContent!.replace(/\s/g, '')).toBe('Owner:john:johns');
  });

  it('shows trivial permissions when acl is trivial', () => {
    const permissionsComponent = spectator.query(ViewTrivialPermissionsComponent)!;
    expect(permissionsComponent).toExist();
    expect(permissionsComponent.stat).toBe(stat);
  });

  it('shows posix permissions when acltype is POSIX', () => {
    const acl = {
      trivial: false,
      acltype: AclType.Posix1e,
    } as PosixAcl;

    spectator.inject(MockApiService).mockCallOnce('filesystem.getacl', acl);

    spectator.setInput('dataset', {
      ...dataset,
      mountpoint: '/mnt/test/posix',
    });

    const permissionsComponent = spectator.query(ViewPosixPermissionsComponent)!;
    expect(permissionsComponent).toExist();
    expect(permissionsComponent.acl).toBe(acl);
  });

  it('does not load permissions for locked datasets', () => {
    jest.resetAllMocks();

    spectator.setInput('dataset', {
      ...dataset,
      locked: true,
    });

    expect(spectator.inject(ApiService).call).not.toHaveBeenCalledWith('filesystem.getacl', expect.anything());
    expect(spectator.fixture.nativeElement).toHaveText('Dataset is locked');
  });

  it('does not load permissions for unmounted datasets', () => {
    jest.resetAllMocks();

    spectator.setInput('dataset', {
      ...dataset,
      mounted: {
        parsed: false,
        rawvalue: 'no',
        value: YesNo.No,
        source: ZfsPropertySource.Local,
      },
    });

    expect(spectator.inject(ApiService).call).not.toHaveBeenCalledWith('filesystem.getacl', expect.anything());
    expect(spectator.inject(ApiService).call).not.toHaveBeenCalledWith('filesystem.stat', expect.anything());
    expect(spectator.fixture.nativeElement).toHaveText('Dataset is not mounted');
  });

  it('does not load permissions for datasets without mountpoint', () => {
    jest.resetAllMocks();

    spectator.setInput('dataset', {
      ...dataset,
      mountpoint: null,
    });

    expect(spectator.inject(ApiService).call).not.toHaveBeenCalledWith('filesystem.getacl', expect.anything());
    expect(spectator.inject(ApiService).call).not.toHaveBeenCalledWith('filesystem.stat', expect.anything());
    expect(spectator.fixture.nativeElement).toHaveText('Dataset has no mountpoint');
  });

  it('shows nfs permissions when acltype is NFS', fakeAsync(() => {
    const acl = {
      trivial: false,
      acltype: AclType.Nfs4,
    } as NfsAcl;

    spectator.inject(MockApiService).mockCallOnce('filesystem.getacl', acl);

    spectator.setInput('dataset', {
      ...dataset,
      mountpoint: '/mnt/test/nfs',
    });
    spectator.tick();
    spectator.detectChanges();

    const permissionsComponent = spectator.query(ViewNfsPermissionsComponent)!;
    expect(permissionsComponent).toExist();
    expect(permissionsComponent.acl).toBe(acl);
  }));

  describe('edit button', () => {
    it('shows a button to edit permissions when dataset can be edited', async () => {
      const editButton = await loader.getHarness(MatButtonHarness.with({ text: 'Edit' }));
      await editButton.click();

      expect(spectator.inject(Router).navigate).toHaveBeenCalledWith(['/datasets', 'testpool/dataset', 'permissions', 'edit']);
    });

    it('disables Edit button when the dataset is root', async () => {
      spectator.setInput('dataset', {
        ...dataset,
        name: 'testpool',
      } as DatasetDetails);

      const editButton = await loader.getHarness(MatButtonHarness.with({ text: 'Edit' }));
      expect(await editButton.isDisabled()).toBe(true);
    });

    it('does not show edit button when dataset is locked', async () => {
      spectator.setInput('dataset', {
        ...dataset,
        locked: true,
      } as DatasetDetails);

      const editButton = await loader.getHarness(MatButtonHarness.with({ text: 'Edit' }));
      expect(await editButton.isDisabled()).toBe(true);
    });

    it('does not show edit button when dataset is readonly', async () => {
      spectator.setInput('dataset', {
        ...dataset,
        readonly: {
          parsed: true,
          rawvalue: 'on',
          value: OnOff.On,
          source: ZfsPropertySource.Local,
        },
      } as DatasetDetails);

      const editButton = await loader.getHarness(MatButtonHarness.with({ text: 'Edit' }));
      expect(await editButton.isDisabled()).toBe(true);
    });
  });
});
