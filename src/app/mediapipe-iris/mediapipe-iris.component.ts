import { GlassesModelService } from './../glasses-model.service';
import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import {
  FaceMesh,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
} from '@mediapipe/face_mesh';
import { drawConnectors } from '@mediapipe/drawing_utils';

@Component({
  selector: 'app-mediapipe-iris',
  templateUrl: './mediapipe-iris.component.html',
  styleUrls: ['./mediapipe-iris.component.css'],
})
export class MediapipeIrisComponent {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private faceMesh!: FaceMesh;
  public cameras: MediaDeviceInfo[] = [];
  public selectedCameraId: string | null = null;
  private stream: MediaStream | null = null;
  public cameraActive: boolean = false;
  private lastFrameTime: number = 0;
  private lastPredictionTime: number = 0; // New property for prediction timing
  public fps: number = 0; // FPS to display

  constructor(private GlassesModelService: GlassesModelService) {}

  async ngOnInit() {
    await this.getCameras();
    await this.GlassesModelService.loadModel();
    this.setupFaceMesh(); // Add this line
  }

  private setupFaceMesh(): void {
    this.faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
    });
    this.faceMesh.onResults(this.onResults.bind(this));
  }

  async getCameras(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter((device) => device.kind === 'videoinput');
      if (this.cameras.length > 0) {
        this.selectedCameraId = this.cameras[0].deviceId;
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
    }
  }

  async startCamera(): Promise<void> {
    if (this.stream) {
      this.stopCamera();
    }

    const constraints = {
      video: {
        deviceId: this.selectedCameraId
          ? { exact: this.selectedCameraId }
          : undefined,
        aspectRatio: 9 / 16,
        width: { ideal: 1080 },
        height: { ideal: 1920 },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.nativeElement.srcObject = this.stream;
      this.cameraActive = true;
      this.startFaceMeshLoop();
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.videoElement.nativeElement.srcObject = null;
      this.stream = null;
      this.cameraActive = false;
    }
  }

  private async startFaceMeshLoop(): Promise<void> {
    const video = this.videoElement.nativeElement;
    if (!video) {
      return;
    }

    const loop = async () => {
      if (this.cameraActive && video.readyState >= 2) {
        const currentTime = performance.now();
        if (this.lastFrameTime) {
          this.fps = Math.round(1000 / (currentTime - this.lastFrameTime));
        }
        this.lastFrameTime = currentTime;
        await this.faceMesh.send({ image: video });
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  private async onResults(results: any): Promise<void> {
    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Set canvas size to match video element's display size
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let irisDetected = false;
    let glassesDetected = '';

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Calculate the distance between the eyelid and iris landmarks
      const eyelidDistance = this.calculateEyelidDistance(landmarks);

      // Define a threshold for detection based on your testing
      const threshold = 0.02; // Adjust this based on accuracy tests

      if (eyelidDistance > threshold) {
        irisDetected = true;

        // Draw eyelid in red
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: 'red' });
        drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: 'red' });

        // Draw outer and inner iris circles
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        this.drawIris(ctx, landmarks, [468, 469, 470, 471], 'green'); // Outer iris
        this.drawIris(ctx, landmarks, [473, 474, 475, 476], 'blue'); // Inner iris

        // Display FPS and iris detection status on the canvas
        ctx.font = '20px Arial';
        ctx.fillStyle = 'green';
        ctx.fillText(`FPS: ${this.fps}`, 10, 30);

        // Check if one second has passed before making a prediction
        const currentTime = performance.now();
        if (currentTime - this.lastPredictionTime > 1000) {
          try {
            const frameImage = await this.getCurrentFrame(video); // Await the promise
            glassesDetected = await this.GlassesModelService.predict(
              frameImage
            );
            console.log(glassesDetected); // Log the prediction
            this.lastPredictionTime = currentTime;
          } catch (error) {
            console.error('Error getting current frame:', error);
          }
        }
      }
    }

    // Display FPS, iris detection status, and glasses detection result on the canvas
    ctx.font = '20px Arial';
    ctx.fillStyle = 'green';
    ctx.fillText(`FPS: ${this.fps}`, 10, 30);
    ctx.fillText(irisDetected ? 'Iris Detected' : "Can't Detect Iris", 10, 60);
  }

  // Helper function to get the current frame from the video
  private async getCurrentFrame(
    video: HTMLVideoElement
  ): Promise<HTMLImageElement> {
    const canvas = document.createElement('canvas');

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('Video dimensions are invalid.');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = canvas.toDataURL();

    // Return a promise that resolves when the image is fully loaded
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image loading failed.'));
    });
  }

  // Calculate the distance between the eyelid and iris to determine eye openness
  private calculateEyelidDistance(landmarks: any): number {
    const leftEyeTop = landmarks[159]; // Top landmark of left eye
    const leftEyeBottom = landmarks[145]; // Bottom landmark of left eye

    const eyeDistance = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    return eyeDistance;
  }

  private drawIris(
    ctx: CanvasRenderingContext2D,
    landmarks: any,
    irisIndices: number[],
    color: string
  ): void {
    let xSum = 0;
    let ySum = 0;

    irisIndices.forEach((index) => {
      xSum += landmarks[index].x * this.canvasElement.nativeElement.width;
      ySum += landmarks[index].y * this.canvasElement.nativeElement.height;
    });

    const centerX = xSum / irisIndices.length;
    const centerY = ySum / irisIndices.length;

    const radius = this.calculateRadius(ctx, landmarks, irisIndices);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  private calculateRadius(
    ctx: CanvasRenderingContext2D,
    landmarks: any,
    indices: number[]
  ): number {
    const centerX =
      landmarks[indices[0]].x * this.canvasElement.nativeElement.width;
    const centerY =
      landmarks[indices[0]].y * this.canvasElement.nativeElement.height;
    const radius = Math.abs(
      centerX - landmarks[indices[1]].x * this.canvasElement.nativeElement.width
    );

    return radius;
  }
}
