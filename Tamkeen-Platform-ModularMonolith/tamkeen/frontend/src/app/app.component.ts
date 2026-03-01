import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MockDataGenerator } from './core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  private mockData = inject(MockDataGenerator);
  ngOnInit() { this.mockData.generate(); }
}
