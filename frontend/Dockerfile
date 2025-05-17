FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

# Install TensorFlow dependencies explicitly
RUN npm install @tensorflow/tfjs @tensorflow-models/coco-ssd --no-save

COPY . .

RUN npm install -g vite

EXPOSE 80

CMD ["npm", "run", "dev", "--", "--port", "80", "--host", "--strictPort", "false"] 