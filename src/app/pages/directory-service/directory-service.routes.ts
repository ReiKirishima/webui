import { Routes } from '@angular/router';
import { marker as T } from '@biesbjerg/ngx-translate-extract-marker';
import { KerberosKeytabsListComponent } from 'app/pages/directory-service/components/kerberos-keytabs/kerberos-keytabs-list/kerberos-keytabs-list.component';
import { KerberosRealmsListComponent } from 'app/pages/directory-service/components/kerberos-realms/kerberos-realms-list.component';

export const routes: Routes = [{
  path: '',
  data: { title: T('Directory Services') },
  children: [
    {
      path: '',
      redirectTo: '/credentials/directory-services',
      pathMatch: 'full',
    }, {
      path: 'kerberosrealms',
      component: KerberosRealmsListComponent,
      data: { title: T('Kerberos Realms'), breadcrumb: null },
    }, {
      path: 'kerberoskeytabs',
      component: KerberosKeytabsListComponent,
      data: { title: T('Kerberos Keytab'), breadcrumb: null },
    }],
}];
