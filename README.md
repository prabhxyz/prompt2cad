# Prompt2CAD

Transform real-world objects into CAD-ready models with your camera.

## Description

Prompt2CAD is a web application that allows users to take photos of real-world objects, process them into 3D models, and generate CAD models based on dimensions and text prompts.

## Features

- Image capture and upload for 3D reconstruction
- Object dimension detection
- Natural language prompt-based CAD model generation
- Real-time 3D model viewing
- CAD model export (STL and JSCAD formats)

## Architecture

The application consists of multiple services:

- **Frontend**: React-based web interface
- **API Gateway**: Node.js-based API service
- **Reconstruction Service**: 3D reconstruction from images
- **CAD Generation Service**: Parametric model generation

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/prompt2cad.git
   cd prompt2cad
   ```

2. Start the application using Docker Compose:
   ```
   docker-compose up -d
   ```

3. Access the web interface at `http://localhost`

### Development Setup

To run the services individually for development:

#### Frontend

```
cd frontend
npm install
npm run dev
```

#### API Service

```
cd api
npm install
npm run dev
```

## Configuration

Environment variables can be configured in the `docker-compose.yml` file or in a `.env` file for local development.

## Troubleshooting

- If the 3D viewer appears blank, check if your browser supports WebGL
- For browser compatibility issues, check the console for diagnostic information

## License

This project is licensed under the MIT License - see the LICENSE file for details. 