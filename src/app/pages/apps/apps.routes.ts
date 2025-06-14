import { Routes } from '@angular/router';
import { marker as T } from '@biesbjerg/ngx-translate-extract-marker';
import { UnsavedFormGuard } from 'app/modules/unsaved-changes/unsaved-form.guard';
import { AppWizardComponent } from 'app/pages/apps/components/app-wizard/app-wizard.component';
import { AppsScopeWrapperComponent } from 'app/pages/apps/components/apps-scope-wrapper.component';
import { AvailableAppsComponent } from 'app/pages/apps/components/available-apps/available-apps.component';
import { CategoryViewComponent } from 'app/pages/apps/components/available-apps/category-view/category-view.component';
import { DockerImagesListComponent } from 'app/pages/apps/components/docker-images/docker-images-list/docker-images-list.component';
import { DockerRegistriesListComponent } from 'app/pages/apps/components/docker-registries/docker-registries-list/docker-registries-list.component';
import { ContainerLogsComponent } from 'app/pages/apps/components/installed-apps/container-logs/container-logs.component';
import { ContainerShellComponent } from 'app/pages/apps/components/installed-apps/container-shell/container-shell.component';
import { InstalledAppsComponent } from 'app/pages/apps/components/installed-apps/installed-apps.component';
import { appNameResolver } from 'app/pages/apps/resolvers/app-name.resolver';
import { AppDetailViewComponent } from './components/app-detail-view/app-detail-view.component';
import { AppRouterOutletComponent } from './components/app-router-outlet/app-router-outlet.component';

export const appsRoutes: Routes = [
  {
    path: '',
    component: AppsScopeWrapperComponent,
    data: { breadcrumb: T('Applications') },
    children: [
      {
        path: '',
        redirectTo: 'installed',
        pathMatch: 'full',
      },
      {
        path: 'installed/manage-container-images',
        redirectTo: 'manage-container-images',
        pathMatch: 'full',
      },
      {
        path: 'installed/docker-registries',
        redirectTo: 'docker-registries',
        pathMatch: 'full',
      },
      {
        path: 'installed',
        component: AppRouterOutletComponent,
        data: { breadcrumb: undefined },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: InstalledAppsComponent,
          },
          {
            path: ':train/:appId',
            component: AppRouterOutletComponent,
            data: { breadcrumb: null },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: InstalledAppsComponent,
              },
              {
                path: 'edit',
                component: AppWizardComponent,
                data: { breadcrumb: null },
                canDeactivate: [UnsavedFormGuard],
              },
              {
                path: 'shell/:containerId',
                component: ContainerShellComponent,
                data: { title: T('Container Shell') },
              },
              {
                path: 'logs/:containerId',
                component: ContainerLogsComponent,
                data: { title: T('Container Logs') },
              },
            ],
          },
        ],
      },
      {
        path: 'manage-container-images',
        component: DockerImagesListComponent,
        data: { title: T('Manage Container Images') },
      },
      {
        path: 'docker-registries',
        component: DockerRegistriesListComponent,
        data: { title: T('Docker Registries') },
      },
      {
        path: 'available',
        component: AppRouterOutletComponent,
        data: { breadcrumb: T('Discover') },
        children: [
          {
            path: '',
            component: AvailableAppsComponent,
          },
          {
            path: ':category',
            component: CategoryViewComponent,
          },
          {
            path: ':train/:appId',
            component: AppRouterOutletComponent,
            resolve: { breadcrumb: appNameResolver },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: AppDetailViewComponent,
              },
              {
                path: 'install',
                component: AppWizardComponent,
                canDeactivate: [UnsavedFormGuard],
              },
            ],
          },
        ],
      },
    ],
  },
];
