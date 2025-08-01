import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Role } from 'app/enums/role.enum';
import { LoggedInUser } from 'app/interfaces/ds-cache.interface';
import { AuthService } from 'app/modules/auth/auth.service';

@Injectable()
export class MockAuthService extends AuthService {
  setUser(user: LoggedInUser): void {
    this.loggedInUser$.next(user);
  }

  setRoles(roles: Role[]): void {
    const currentUser = this.loggedInUser$.getValue();
    this.loggedInUser$.next({
      ...currentUser,
      privilege: {
        ...(currentUser?.privilege || {}),
        roles: {
          $set: roles,
        },
      },
    } as LoggedInUser);
  }

  override refreshUser = jest.fn(() => of(undefined));

  override clearAuthToken(): void {
    // Mock implementation to avoid ngx-webstorage issues in tests
  }
}
