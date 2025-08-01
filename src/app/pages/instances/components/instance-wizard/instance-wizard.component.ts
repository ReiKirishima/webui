import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, computed, effect, OnInit, signal,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import {
  delay,
  filter, map, Observable, of, switchMap, tap,
} from 'rxjs';
import { slashRootNode } from 'app/constants/basic-root-nodes.constant';
import { Role } from 'app/enums/role.enum';
import {
  VirtualizationDeviceType,
  VirtualizationGpuType,
  VirtualizationNicType,
  virtualizationNicTypeLabels,
  VirtualizationProxyProtocol,
  virtualizationProxyProtocolLabels,
  VirtualizationRemote,
  VirtualizationSource,
  VirtualizationType,
} from 'app/enums/virtualization.enum';
import { choicesToOptions, singleArrayToOptions } from 'app/helpers/operators/options.operators';
import { mapToOptions } from 'app/helpers/options.helper';
import { instancesHelptext } from 'app/helptext/instances/instances';
import { Option } from 'app/interfaces/option.interface';
import {
  CreateVirtualizationInstance,
  InstanceEnvVariablesFormGroup,
  VirtualizationDevice,
  VirtualizationInstance,
  VirtualizationNic,
} from 'app/interfaces/virtualization.interface';
import { AuthService } from 'app/modules/auth/auth.service';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { IxCheckboxComponent } from 'app/modules/forms/ix-forms/components/ix-checkbox/ix-checkbox.component';
import {
  IxCheckboxListComponent,
} from 'app/modules/forms/ix-forms/components/ix-checkbox-list/ix-checkbox-list.component';
import {
  ExplorerCreateDatasetComponent,
} from 'app/modules/forms/ix-forms/components/ix-explorer/explorer-create-dataset/explorer-create-dataset.component';
import { IxExplorerComponent } from 'app/modules/forms/ix-forms/components/ix-explorer/ix-explorer.component';
import {
  IxFormGlossaryComponent,
} from 'app/modules/forms/ix-forms/components/ix-form-glossary/ix-form-glossary.component';
import {
  IxFormSectionComponent,
} from 'app/modules/forms/ix-forms/components/ix-form-section/ix-form-section.component';
import { IxInputComponent } from 'app/modules/forms/ix-forms/components/ix-input/ix-input.component';
import { IxListItemComponent } from 'app/modules/forms/ix-forms/components/ix-list/ix-list-item/ix-list-item.component';
import { IxListComponent } from 'app/modules/forms/ix-forms/components/ix-list/ix-list.component';
import { IxSelectComponent } from 'app/modules/forms/ix-forms/components/ix-select/ix-select.component';
import { ReadOnlyComponent } from 'app/modules/forms/ix-forms/components/readonly-badge/readonly-badge.component';
import { FormErrorHandlerService } from 'app/modules/forms/ix-forms/services/form-error-handler.service';
import { IxFormatterService } from 'app/modules/forms/ix-forms/services/ix-formatter.service';
import { cpuValidator } from 'app/modules/forms/ix-forms/validators/cpu-validation/cpu-validation';
import {
  forbiddenAsyncValues,
} from 'app/modules/forms/ix-forms/validators/forbidden-values-validation/forbidden-values-validation';
import { PageHeaderComponent } from 'app/modules/page-header/page-title-header/page-header.component';
import { SnackbarService } from 'app/modules/snackbar/services/snackbar.service';
import { TestDirective } from 'app/modules/test-id/test.directive';
import { ignoreTranslation } from 'app/modules/translate/translate.helper';
import { UnsavedChangesService } from 'app/modules/unsaved-changes/unsaved-changes.service';
import { ApiService } from 'app/modules/websocket/api.service';
import { InstanceNicMacDialog } from 'app/pages/instances/components/common/instance-nics-mac-addr-dialog/instance-nic-mac-dialog.component';
import {
  SelectImageDialog,
  VirtualizationImageWithId,
} from 'app/pages/instances/components/instance-wizard/select-image-dialog/select-image-dialog.component';
import { VirtualizationConfigStore } from 'app/pages/instances/stores/virtualization-config.store';
import { FilesystemService } from 'app/services/filesystem.service';

interface NicDeviceOption {
  control: FormControl<boolean>;
  label: string;
  mac?: string;
  value: string;
}

@UntilDestroy()
@Component({
  selector: 'ix-instance-wizard',
  imports: [
    AsyncPipe,
    IxCheckboxComponent,
    IxCheckboxListComponent,
    IxExplorerComponent,
    IxFormGlossaryComponent,
    IxFormSectionComponent,
    IxInputComponent,
    IxListComponent,
    IxListItemComponent,
    IxSelectComponent,
    MatButton,
    NgxSkeletonLoaderModule,
    PageHeaderComponent,
    ReactiveFormsModule,
    ReadOnlyComponent,
    TestDirective,
    TranslateModule,
    ExplorerCreateDatasetComponent,
  ],
  templateUrl: './instance-wizard.component.html',
  styleUrls: ['./instance-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstanceWizardComponent implements OnInit {
  protected readonly isLoading = signal<boolean>(false);
  protected readonly requiredRoles = [Role.VirtGlobalWrite];
  protected readonly hasPendingInterfaceChanges = toSignal(this.api.call('interface.has_pending_changes'));

  protected readonly slashRootNode = [slashRootNode];

  protected readonly proxyProtocols$ = of(mapToOptions(virtualizationProxyProtocolLabels, this.translate));
  protected readonly bridgedNicTypeLabel = virtualizationNicTypeLabels.get(VirtualizationNicType.Bridged);
  protected readonly macVlanNicTypeLabel = virtualizationNicTypeLabels.get(VirtualizationNicType.Macvlan);

  protected readonly forbiddenNames$ = this.api.call('virt.instance.query', [
    [], { select: ['name'], order_by: ['name'] },
  ]).pipe(map((keys) => keys.map((key) => key.name)));

  readonly VirtualizationSource = VirtualizationSource;

  protected readonly bridgedNicDevices = signal<NicDeviceOption[]>(undefined);
  protected readonly macVlanNicDevices = signal<NicDeviceOption[]>(undefined);

  usbDevices$ = this.api.call('virt.device.usb_choices').pipe(
    map((choices) => Object.values(choices).map((choice) => ({
      label: ignoreTranslation(`${choice.product} (${choice.product_id})`),
      value: choice.product_id.toString(),
    }))),
  );

  gpuDevices$ = this.api.call(
    'virt.device.gpu_choices',
    [VirtualizationGpuType.Physical],
  ).pipe(
    map((choices) => Object.entries(choices).map(([pci, gpu]) => ({
      label: gpu.description,
      value: pci,
    }))),
  );

  protected poolOptions$ = this.configStore.state$.pipe(
    filter((state) => !state.isLoading),
    map((state) => state.config?.storage_pools),
    singleArrayToOptions(),
    tap((options) => {
      if (options.length && !this.form.controls.storage_pool.value) {
        this.form.controls.storage_pool.setValue(`${options[0].value}`);
      }
    }),
  );

  protected hasOnePool = computed(() => this.configStore.config()?.storage_pools?.length === 1);

  protected readonly form = this.formBuilder.group({
    name: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(200), Validators.pattern(/^[a-zA-Z0-9-]+$/)],
      [forbiddenAsyncValues(this.forbiddenNames$)],
    ],
    image: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    cpu: ['', [cpuValidator()]],
    memory: [null as number | null],
    storage_pool: [null as string | null, [Validators.required]],
    use_default_network: [true],
    usb_devices: [[] as string[]],
    gpu_devices: [[] as string[]],
    proxies: this.formBuilder.array<FormGroup<{
      source_proto: FormControl<VirtualizationProxyProtocol>;
      source_port: FormControl<number | null>;
      dest_proto: FormControl<VirtualizationProxyProtocol>;
      dest_port: FormControl<number | null>;
    }>>([]),
    disks: this.formBuilder.array<FormGroup<{
      source: FormControl<string>;
      destination?: FormControl<string>;
    }>>([]),
    environment_variables: new FormArray<InstanceEnvVariablesFormGroup>([]),
  });

  get hasRequiredRoles(): Observable<boolean> {
    return this.authService.hasRole(this.requiredRoles);
  }

  readonly datasetProvider = this.filesystem.getFilesystemNodeProvider({ datasetsOnly: true });

  protected defaultIpv4Network = computed(() => {
    return this.configStore.config()?.v4_network || this.translate.instant('N/A');
  });

  protected defaultIpv6Network = computed(() => {
    return this.configStore.config()?.v6_network || this.translate.instant('N/A');
  });

  constructor(
    private api: ApiService,
    private formBuilder: NonNullableFormBuilder,
    private matDialog: MatDialog,
    private router: Router,
    private formErrorHandler: FormErrorHandlerService,
    private translate: TranslateService,
    private snackbar: SnackbarService,
    private dialogService: DialogService,
    protected formatter: IxFormatterService,
    protected configStore: VirtualizationConfigStore,
    private authService: AuthService,
    private filesystem: FilesystemService,
    private unsavedChangesService: UnsavedChangesService,
  ) {
    this.configStore.initialize();

    effect(() => {
      if (!this.form.value.storage_pool && this.hasOnePool()) {
        this.form.patchValue({ storage_pool: this.configStore.config()?.storage_pools?.[0] });
      }
    });
  }

  ngOnInit(): void {
    this.setupBridgedNicDevices2();
    this.setupMacVlanNicDevices2();
  }

  protected canDeactivate(): Observable<boolean> {
    return this.form.dirty ? this.unsavedChangesService.showConfirmDialog() : of(true);
  }

  private setupBridgedNicDevices2(): void {
    this.setupNicDevices(VirtualizationNicType.Bridged, this.bridgedNicDevices);
  }

  private setupMacVlanNicDevices2(): void {
    this.setupNicDevices(VirtualizationNicType.Macvlan, this.macVlanNicDevices);
  }

  private setupNicDevices(
    type: VirtualizationNicType,
    nicDevicesSignal: WritableSignal<NicDeviceOption[]>,
  ): void {
    this.getNicDevicesOptions(type).pipe(
      untilDestroyed(this),
    ).subscribe({
      next: (options) => {
        nicDevicesSignal.set([]);

        for (const option of options) {
          const control = new FormControl<boolean>(false);

          control.valueChanges.pipe(
            tap((selected) => {
              if (!selected) {
                nicDevicesSignal.set(
                  nicDevicesSignal().map((nic) => {
                    if (nic.value === option.value) {
                      nic.label = option.label;
                      delete nic.mac;
                    }
                    return nic;
                  }),
                );
              }
            }),
            filter(Boolean),
            switchMap(() => this.matDialog.open(InstanceNicMacDialog, {
              data: option.value,
              minWidth: '500px',
            }).afterClosed() as Observable<{ useDefault: boolean; mac: string }>),
            untilDestroyed(this),
          ).subscribe({
            next: (macConfig) => {
              if (!macConfig) {
                control.setValue(false);
                return;
              }

              nicDevicesSignal.set(
                nicDevicesSignal().map((nic) => {
                  if (nic.value === option.value) {
                    if (macConfig.useDefault) {
                      nic.label = `${option.label} (${this.translate.instant('Default Mac Address')})`;
                    } else if (macConfig.mac) {
                      nic.label = `${option.label} (${macConfig.mac})`;
                      nic.mac = macConfig.mac;
                    } else {
                      nic.label = option.label;
                    }
                  }
                  return nic;
                }),
              );
            },
          });

          const deviceOption: NicDeviceOption = {
            label: option.label,
            control,
            value: option.value.toString(),
          };

          nicDevicesSignal.set([...nicDevicesSignal(), deviceOption]);
        }
      },
    });
  }

  protected onBrowseCatalogImages(): void {
    this.matDialog
      .open(SelectImageDialog, {
        minWidth: '90vw',
        data: {
          remote: VirtualizationRemote.LinuxContainers,
          type: VirtualizationType.Container,
        },
      })
      .afterClosed()
      .pipe(filter(Boolean), untilDestroyed(this))
      .subscribe((image: VirtualizationImageWithId) => {
        this.form.controls.image.setValue(image.id);
      });
  }

  protected addProxy(): void {
    const control = this.formBuilder.group({
      source_proto: [VirtualizationProxyProtocol.Tcp],
      source_port: [null as number | null, [Validators.required, Validators.min(1), Validators.max(65535)]],
      dest_proto: [VirtualizationProxyProtocol.Tcp],
      dest_port: [null as number | null, [Validators.required, Validators.min(1), Validators.max(65535)]],
    });

    this.form.controls.proxies.push(control);
  }

  protected removeProxy(index: number): void {
    this.form.controls.proxies.removeAt(index);
  }

  protected addDisk(): void {
    const control = this.formBuilder.group({
      source: ['', Validators.required],
      destination: ['', Validators.required],
    }) as FormGroup<{
      source: FormControl<string>;
      destination?: FormControl<string>;
    }>;

    this.form.controls.disks.push(control);
  }

  protected removeDisk(index: number): void {
    this.form.controls.disks.removeAt(index);
  }

  protected onSubmit(): void {
    this.createInstance().pipe(untilDestroyed(this)).subscribe({
      next: (instance) => {
        this.form.markAsPristine();
        this.snackbar.success(this.translate.instant('Container created'));
        this.router.navigate(['/containers', 'view', instance?.id]);
      },
      error: (error: unknown) => {
        this.formErrorHandler.handleValidationErrors(error, this.form);
      },
    });
  }

  protected addEnvironmentVariable(): void {
    const control = this.formBuilder.group({
      name: ['', Validators.required],
      value: ['', Validators.required],
    });

    this.form.controls.environment_variables.push(control);
  }

  protected removeEnvironmentVariable(index: number): void {
    this.form.controls.environment_variables.removeAt(index);
  }

  private createInstance(): Observable<VirtualizationInstance> {
    const payload = this.getPayload();

    const job$ = this.api.job('virt.instance.create', [payload]);

    return this.dialogService
      .jobDialog(job$, { title: this.translate.instant('Creating Container') })
      .afterClosed().pipe(map((job) => job.result));
  }

  private getPayload(): CreateVirtualizationInstance {
    const form = this.form.getRawValue();

    const payload = {
      devices: this.getDevicesPayload(),
      autostart: true,
      instance_type: VirtualizationType.Container,
      name: form.name,
      cpu: form.cpu,
      memory: form.memory || null,
      storage_pool: form.storage_pool,
      source_type: VirtualizationSource.Image,
      image: form.image,
      environment: this.environmentVariablesPayload,
    } as CreateVirtualizationInstance;

    return payload;
  }

  private getNicDevicesOptions(nicType: VirtualizationNicType): Observable<Option[]> {
    return this.api.call('virt.device.nic_choices', [nicType]).pipe(choicesToOptions(), delay(5 * 1000));
  }

  private get environmentVariablesPayload(): Record<string, string> {
    return this.form.controls.environment_variables.controls.reduce((env: Record<string, string>, control) => {
      const name = control.get('name')?.value;
      const value = control.get('value')?.value;

      if (name && value) {
        env[name] = value;
      }
      return env;
    }, {});
  }

  private getDevicesPayload(): VirtualizationDevice[] {
    const disks = this.form.controls.disks.value.map((disk) => ({
      dev_type: VirtualizationDeviceType.Disk,
      source: disk.source,
      destination: disk.destination,
    }));

    const usbDevices: { dev_type: VirtualizationDeviceType; product_id: string }[] = [];
    for (const productId of this.form.controls.usb_devices.value) {
      usbDevices.push({
        dev_type: VirtualizationDeviceType.Usb,
        product_id: productId,
      });
    }

    const gpuDevices: { pci: string; dev_type: VirtualizationDeviceType; gpu_type: VirtualizationGpuType }[] = [];
    for (const pci of this.form.controls.gpu_devices.value) {
      gpuDevices.push({
        pci,
        dev_type: VirtualizationDeviceType.Gpu,
        gpu_type: VirtualizationGpuType.Physical,
      });
    }
    const macVlanNics: Partial<VirtualizationNic>[] = [];
    if (!this.form.controls.use_default_network.value) {
      const macVlanDeviceOptions = this.macVlanNicDevices();
      const selectedValues: NicDeviceOption[] = [];
      for (const deviceOption of macVlanDeviceOptions) {
        if (deviceOption.control.value) {
          selectedValues.push(deviceOption);
        }
      }
      for (const deviceOption of selectedValues) {
        const macVlanNic: Partial<VirtualizationNic> = {
          parent: deviceOption.value,
          dev_type: VirtualizationDeviceType.Nic,
          nic_type: VirtualizationNicType.Macvlan,
        };
        if (deviceOption.mac) {
          macVlanNic.mac = deviceOption.mac;
        }
        macVlanNics.push(macVlanNic);
      }
    }

    const bridgedNics: Partial<VirtualizationNic>[] = [];
    if (!this.form.controls.use_default_network.value) {
      const bridgedDeviceOptions = this.bridgedNicDevices();
      const selectedValues: NicDeviceOption[] = [];
      for (const deviceOption of bridgedDeviceOptions) {
        if (deviceOption.control.value) {
          selectedValues.push(deviceOption);
        }
      }
      for (const deviceOption of selectedValues) {
        const bridgedNic: Partial<VirtualizationNic> = {
          parent: deviceOption.value,
          dev_type: VirtualizationDeviceType.Nic,
          nic_type: VirtualizationNicType.Bridged,
        };
        if (deviceOption.mac) {
          bridgedNic.mac = deviceOption.mac;
        }
        bridgedNics.push(bridgedNic);
      }
    }

    const proxies = this.form.controls.proxies.value.map((proxy) => ({
      dev_type: VirtualizationDeviceType.Proxy,
      source_proto: proxy.source_proto,
      source_port: proxy.source_port,
      dest_proto: proxy.dest_proto,
      dest_port: proxy.dest_port,
    }));

    return [
      ...disks,
      ...proxies,
      ...macVlanNics,
      ...bridgedNics,
      ...usbDevices,
      ...gpuDevices,
    ] as VirtualizationDevice[];
  }

  protected readonly instancesHelptext = instancesHelptext;
}
