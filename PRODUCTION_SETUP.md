# Setting up Prompt2CAD for Production

This guide provides instructions for running Prompt2CAD in production mode with real LLM model inference using the Hugging Face API.

## Prerequisites

- Docker and Docker Compose installed
- Hugging Face account and API key (for best performance)
- At least 4GB of RAM (8GB recommended for running all services)

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/your-organization/prompt2cad.git
   cd prompt2cad
   ```

2. Set up Hugging Face API access:
   
   a. Create a Hugging Face account at https://huggingface.co/
   
   b. Create an API key at https://huggingface.co/settings/tokens
   
   c. Create a .env file with your API key:
   ```
   # Copy the example file
   cp huggingface.env.example .env
   
   # Edit the file to add your API key
   # HF_API_KEY=your_key_here
   ```

   Note: The system will work without an API key but may be rate-limited by Hugging Face.

3. Start the services:
   ```
   docker-compose up
   ```

4. Access the application at http://localhost:80

## Configuration Options

### Hugging Face API

The system uses the Hugging Face Inference API to generate CAD models, which has several advantages:
- No need to download large models (saves 5-7GB of disk space)
- No heavy compute requirements on your local machine
- Access to the latest models without updating local files

You can configure the following environment variables:

- `HF_API_KEY`: Your Hugging Face API key for authenticated access
- `HF_MODEL_ID`: The model to use from Hugging Face (default: google/gemma-2b)

### Available Models

You can use various models by changing the `HF_MODEL_ID` environment variable in your .env file or docker-compose.yml:

#### Recommended Models:

- `google/gemma-2b`: A good balance of quality and speed
- `google/gemma-7b`: Better quality but slightly slower
- `meta-llama/Llama-2-7b-chat-hf`: Good alternative model
- `mistralai/Mistral-7B-Instruct-v0.2`: Another good alternative

To use these models, you may need to accept the model terms on Hugging Face:
1. Visit the model page (e.g., https://huggingface.co/google/gemma-2b)
2. Click "Access repository" and accept the terms
3. Use your API key as described above

### Environment Variables

You can modify these variables in the `docker-compose.yml` file:

#### CAD Service
- `HF_API_KEY`: Your Hugging Face API key
- `HF_MODEL_ID`: The model to use from Hugging Face
- `LOG_LEVEL`: Logging verbosity (default: "INFO")

#### Frontend
- `VITE_ENABLE_CAMERA`: Enable camera access (default: "true")
- `VITE_INSECURE_CAMERA`: Allow camera on HTTP (default: "true")

## Troubleshooting

### API Access Issues
- If you see authentication errors, check that your API key is correct
- Make sure you have accepted the model terms on Hugging Face for the model you're using
- If you're getting rate limited, consider using a paid Hugging Face plan or implementing queue mechanisms

### API Service Errors
- If upload.js or static.js shows encoding issues, recreate the files with correct encoding
- Ensure node dependencies are installed correctly

### Performance Issues
- If API responses are slow, try a smaller model like google/gemma-2b
- Consider implementing local caching of API responses for repeated prompts 