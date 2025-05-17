import os
import logging
import json
import requests
from typing import Optional

logger = logging.getLogger("llm")

class LlamaModel:
    """Wrapper around Hugging Face Inference API for LLM inference"""
    
    def __init__(
        self,
        model_path: str = None,  # Not used anymore but kept for compatibility
        n_ctx: int = 2048,       # Not used anymore but kept for compatibility
        n_threads: Optional[int] = None,  # Not used anymore but kept for compatibility
        n_gpu_layers: Optional[int] = None,  # Not used anymore but kept for compatibility
    ):
        """Initialize the API-based LLM
        
        Args:
            model_path: Not used, kept for compatibility
            n_ctx: Not used, kept for compatibility
            n_threads: Not used, kept for compatibility
            n_gpu_layers: Not used, kept for compatibility
        """
        # Get HF_API_KEY from environment
        self.api_key = os.environ.get("HF_API_KEY")
        
        # Default to Gemma 2B if no model specified
        self.model_id = os.environ.get("HF_MODEL_ID", "google/gemma-2b")
        
        if not self.api_key:
            logger.warning("No Hugging Face API key found in HF_API_KEY environment variable")
            logger.warning("Running in free tier mode - expect throttling")
        
        logger.info(f"Initialized API-based LLM using model: {self.model_id}")
        
    def generate(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.5,
        top_p: float = 0.9,
        stop: Optional[list] = None
    ) -> str:
        """Generate text using Hugging Face Inference API
        
        Args:
            prompt: Input text
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling probability
            stop: List of sequences to stop generation
            
        Returns:
            Generated text as string
        """
        headers = {
            "Content-Type": "application/json"
        }
        
        # Add API key if available
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Prepare the payload
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "return_full_text": False
            }
        }
        
        if stop:
            payload["parameters"]["stop_sequences"] = stop
        
        api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        
        try:
            logger.info(f"Sending request to Hugging Face API for model {self.model_id}")
            response = requests.post(api_url, headers=headers, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                # Handle different response formats
                if isinstance(result, list) and len(result) > 0:
                    if "generated_text" in result[0]:
                        return result[0]["generated_text"].strip()
                    else:
                        return str(result[0]).strip()
                elif isinstance(result, dict) and "generated_text" in result:
                    return result["generated_text"].strip()
                else:
                    return str(result).strip()
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return self._mock_generate(prompt)
                
        except Exception as e:
            logger.error(f"API request error: {str(e)}")
            return self._mock_generate(prompt)
            
    def _mock_generate(self, prompt: str) -> str:
        """Generate a mock response when API fails"""
        logger.info("API failed, generating mock CAD code")
        return """function main() {
  const dimensions = {
    width: 100,
    height: 80,
    depth: 50
  };
  
  return createCase(dimensions);
}

function createCase(dimensions) {
  const offset = 3;
  
  return CSG.cube({
    center: [0, 0, 0],
    radius: [
      dimensions.width/2 + offset,
      dimensions.height/2 + offset,
      dimensions.depth/2 + offset
    ]
  }).subtract(
    CSG.cube({
      center: [0, 0, offset/2],
      radius: [
        dimensions.width/2,
        dimensions.height/2,
        dimensions.depth/2
      ]
    })
  );
}""" 