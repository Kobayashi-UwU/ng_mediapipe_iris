import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
declare var cv: any;

@Injectable({
  providedIn: 'root',
})
export class GlassesModelService {
  model: any = {
    net: null,
    inputShape: [1, 128, 128, 3],
  };

  classNames: string[] = [
    'covering',
    'glasses',
    'plain',
    'sunglasses',
    'sunglasses-imagenet',
  ];

  constructor() {}

  async loadModel() {
    await tf.ready();

    // Load OpenCV.js
    await this.loadOpenCV();

    try {
      console.log('Starting model load...');
      this.model.net = await tf.loadGraphModel('model.json', {
        onProgress: (fraction) => {
          console.log(
            `Model loading progress: ${(fraction * 100).toFixed(2)}%`
          );
        },
      });
      console.log('Model loaded:', this.model.net);

      // Warm up the model
      const dummyInput = tf.ones([1, 128, 128, 3]);
      await this.model.net.executeAsync(dummyInput);
      tf.dispose(dummyInput);

      console.log('Model executed successfully');
      // Update the HTML with the result
      const loadmodelstatusElement = document.getElementById('load_model');
      if (loadmodelstatusElement) {
        loadmodelstatusElement.innerText = `Model load Status : Done`;
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  async loadOpenCV() {
    return new Promise<void>((resolve, reject) => {
      // Wait for OpenCV.js to load
      (window as any).onOpenCVReady = () => {
        console.log('OpenCV.js is ready.');
        resolve();
      };

      // Check if OpenCV is already loaded
      if (typeof cv !== 'undefined') {
        (window as any).onOpenCVReady();
      } else {
        reject('OpenCV.js failed to load.');
      }
    });
  }

  async predict(image: HTMLImageElement): Promise<string> {
    // Preprocess the image
    const preprocessedImg = this.blurAndGrayscale(image);

    // Preprocess the image to match the model's input shape
    const imgTensor = tf.browser
      .fromPixels(preprocessedImg)
      .resizeBilinear([128, 128]);
    const batchedTensor = imgTensor.expandDims(0).toFloat().div(255.0);

    // Run inference using execute()
    const predictions = this.model.net.execute(batchedTensor) as tf.Tensor; // Cast to Tensor for TypeScript

    const scores = predictions.dataSync();
    const highestScoreIndex = scores.indexOf(Math.max(...scores));

    // Clean up tensors
    tf.dispose([imgTensor, batchedTensor, predictions]);

    // Get the class name with the highest score or a default value if none
    const result = this.classNames[highestScoreIndex] || 'No detection'; // Default to 'No detection'

    // Update the HTML with the result
    const statusElement = document.getElementById('glasses_status');
    if (statusElement) {
      statusElement.innerText = `Status: ${result}`; // Update with the prediction result
    }

    return result; // Return the prediction result
  }

  private blurAndGrayscale(image: HTMLImageElement): HTMLCanvasElement {
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set the canvas size to the image size
    canvas.width = image.width;
    canvas.height = image.height;

    // Check if ctx is not null before using it
    if (ctx) {
      // Draw the image onto the canvas
      ctx.drawImage(image, 0, 0);

      // Get the image data
      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imgData.data;

      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; // RGB to grayscale formula
        data[i] = avg; // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
        // data[i + 3] is the alpha channel, which we leave unchanged
      }

      // Put the modified image data back onto the canvas
      ctx.putImageData(imgData, 0, 0);

      // Now, apply Gaussian blur using OpenCV.js
      const src = cv.imread(canvas); // Read the canvas into an OpenCV Mat
      const dst = new cv.Mat(); // Create a new Mat for the blurred image

      // Apply Gaussian blur
      cv.GaussianBlur(src, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      // Write the blurred image back to the canvas
      cv.imshow(canvas, dst);

      // Clean up memory
      src.delete();
      dst.delete();
    } else {
      console.error('Could not get canvas context');
    }

    return canvas; // Return the modified canvas
  }
}
