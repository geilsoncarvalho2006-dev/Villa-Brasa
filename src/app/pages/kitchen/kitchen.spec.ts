import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kitchen } from './kitchen';

describe('Kitchen', () => {
  let component: Kitchen;
  let fixture: ComponentFixture<Kitchen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Kitchen],
    }).compileComponents();

    fixture = TestBed.createComponent(Kitchen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
