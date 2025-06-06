import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatIconHarness } from '@angular/material/icon/testing';
import { Spectator } from '@ngneat/spectator';
import { byText } from '@ngneat/spectator/jest';
import { AlertComponent } from 'app/modules/alerts/components/alert/alert.component';

export class AlertPageObject {
  private loader: HarnessLoader;

  constructor(private spectator: Spectator<AlertComponent>) {
    this.loader = TestbedHarnessEnvironment.loader(this.spectator.fixture);
  }

  get levelElement(): HTMLElement | null {
    return this.spectator.query('.alert-level');
  }

  get messageElement(): HTMLElement | null {
    return this.spectator.query('.alert-message');
  }

  get dateTimeElement(): HTMLElement | null {
    return this.spectator.query('.alert-time');
  }

  get nodeElement(): HTMLElement | null {
    return this.spectator.query('.alert-node');
  }

  async getIconHarness(): Promise<MatIconHarness> {
    return this.loader.getHarness(MatIconHarness);
  }

  clickDismissLink(): void {
    const link = this.spectator.query(byText('Dismiss'));
    if (!link) {
      throw new Error('Dismiss link not found');
    }
    this.spectator.click(link);
  }

  clickReopenLink(): void {
    const link = this.spectator.query(byText('Re-Open'));
    if (!link) {
      throw new Error('Re-Open link not found');
    }
    this.spectator.click(link);
  }
}
