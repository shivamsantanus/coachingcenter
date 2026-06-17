import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { FeePlansTabComponent } from './fee-plans-tab/fee-plans-tab.component';
import { PaymentsTabComponent } from './payments-tab/payments-tab.component';
import { FeeCollectionTabComponent } from './fee-collection-tab/fee-collection-tab.component';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [TabsModule, FeePlansTabComponent, PaymentsTabComponent, FeeCollectionTabComponent],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.scss'],
})
export class FeesComponent {}
