This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). This repository is a simple application demo on integrating llama.cpp with SmolVLM 500M to get real time object detection.

## Getting Started

First, run the development server:

```bash
npm run dev
```

on a separte terminal run a llama server instance

```bash
npm run llama
```

## Additional Notes

this requires you to install llama.cpp on your device.

- you may need to add `-ngl 99` to enable GPU (if you are using NVidia/AMD/Intel GPU)
- you can try using other models - [here.](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)
