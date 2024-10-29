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
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  async predict(image: HTMLImageElement): Promise<string> {
    // Preprocess the image to match the model's input shape
    const imgTensor = tf.browser.fromPixels(image).resizeBilinear([128, 128]);
    const batchedTensor = imgTensor.expandDims(0).toFloat().div(255.0);

    // Run inference using execute()
    const predictions = this.model.net.execute(batchedTensor) as tf.Tensor; // Cast to Tensor for TypeScript

    const scores = predictions.dataSync();
    const highestScoreIndex = scores.indexOf(Math.max(...scores));

    // Clean up tensors
    tf.dispose([imgTensor, batchedTensor, predictions]);

    // Return the class name with the highest score or a default value if none
    return this.classNames[highestScoreIndex] || 'No detection'; // Default to 'No detection'
  }
}
