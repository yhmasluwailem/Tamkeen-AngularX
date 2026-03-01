import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MockDataGenerator {
  generate() {
    // Mock data is already seeded via MOCK_* constants in StoreService
  }
}
