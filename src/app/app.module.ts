import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MediapipeIrisComponent } from './mediapipe-iris/mediapipe-iris.component';

@NgModule({
  declarations: [
    AppComponent, // Main application component
  ],
  imports: [
    BrowserModule, // Basic browser module for the app to run in browsers
    FormsModule,
    MediapipeIrisComponent, // Mediapipe-based iris recognition component
  ],
  providers: [],
  bootstrap: [AppComponent], // Specifies the root component to bootstrap
})
export class AppModule {}
