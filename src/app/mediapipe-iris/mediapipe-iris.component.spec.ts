import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediapipeIrisComponent } from './mediapipe-iris.component';

describe('MediapipeIrisComponent', () => {
  let component: MediapipeIrisComponent;
  let fixture: ComponentFixture<MediapipeIrisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediapipeIrisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediapipeIrisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
