#!/bin/bash
set -e

MODEL_PATH="/app/models/gemma-2b.gguf"
LLAMA_MODEL="/app/models/llama-2-7b-chat.Q4_K_M.gguf"

# Check if model exists, if not download a different model that doesn't require auth
if [ ! -f "$MODEL_PATH" ] && [ ! -f "$LLAMA_MODEL" ]; then
  echo "Gemma model requires Hugging Face authentication."
  echo "Downloading alternative Llama 2 model that doesn't require authentication..."
  mkdir -p /app/models
  wget -O "$LLAMA_MODEL" https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
  
  # Update the MODEL_PATH environment variable to use the new model
  export MODEL_PATH="$LLAMA_MODEL"
  echo "Model downloaded successfully"
else
  if [ -f "$MODEL_PATH" ]; then
    echo "Using existing Gemma 2B model"
  elif [ -f "$LLAMA_MODEL" ]; then
    export MODEL_PATH="$LLAMA_MODEL"
    echo "Using existing Llama 2 model"
  fi
fi

# Start the FastAPI application
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8001 