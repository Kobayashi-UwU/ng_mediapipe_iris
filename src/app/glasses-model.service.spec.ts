import { TestBed } from '@angular/core/testing';

import { GlassesModelService } from './glasses-model.service';

describe('GlassesModelService', () => {
  let service: GlassesModelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlassesModelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
