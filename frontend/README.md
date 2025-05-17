# Prompt2CAD Frontend

This is the frontend application for Prompt2CAD, a tool that helps you scan objects and convert them to 3D CAD models.

## Object Detection Feature

The application includes a robust object detection system that estimates real-world dimensions of objects using TensorFlow.js and COCO-SSD. The implementation:

1. **Dynamically loads TensorFlow.js** to avoid blocking the main thread
2. **Uses COCO-SSD model** for object detection
3. **Estimates real-world dimensions** using known reference object sizes
4. **Provides fallbacks** if TensorFlow.js or models fail to load
5. **Works seamlessly in the browser** with camera integration

### How It Works

The object dimension detection uses a multi-step approach:

1. The user captures photos of their object
2. When reaching the "Object Dimensions" step, the system:
   - Loads TensorFlow.js and COCO-SSD model
   - Analyzes the video feed to detect objects
   - Identifies objects by class (cup, keyboard, book, etc.)
   - Uses reference object sizes to estimate actual dimensions
   - Calculates width, height, and depth in mm

### Technical Implementation

The implementation is designed to be robust against various failure points:

- **Dynamic imports** ensure the app loads quickly even on slow connections
- **WebGL optimization** for faster inference when available
- **CPU fallback** when WebGL is not available
- **Mock detection** if TensorFlow.js or models can't be loaded
- **Error handling** at multiple levels

### Reference Object Sizes

The system uses a database of common object sizes to estimate dimensions:

| Object     | Width (mm) |
|------------|------------|
| Cell phone | 70         |
| Bottle     | 70         |
| Cup        | 80         |
| Mouse      | 60         |
| Book       | 150        |
| Keyboard   | 350        |
| Laptop     | 330        |
| Monitor    | 500        |

If the detected object isn't in the reference database, the system estimates dimensions based on the object's size in the frame.

## Future Improvements

In future versions, we plan to:

1. Add support for MediaPipe Objectron for true 3D bounding box detection
2. Improve dimension accuracy with multi-view analysis
3. Add more reference objects and custom object calibration
4. Implement a more sophisticated depth estimation algorithm 