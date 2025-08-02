// app/api/video/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to enhance the prompt using OpenAI
async function enhancePrompt(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a creative assistant that enhances video generation prompts. Make the prompt more detailed and descriptive for better video generation results. Focus on visual elements, lighting, atmosphere, and actions. Keep the enhanced prompt concise but rich in detail."
        },
        {
          role: "user",
          content: `Enhance this video generation prompt: "${prompt}"`
        }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content?.trim() || prompt;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return prompt; // Return original prompt if enhancement fails
  }
}

// Function to generate video using Pixverse API
async function generateVideo(prompt: string): Promise<{ video_id: number }> {
  const response = await axios.post(
    "https://app-api.pixverse.ai/openapi/v2/video/text/generate",
    {
      aspect_ratio: "16:9",
      duration: 5,
      model: "v3.5",
      motion_mode: "normal",
      negative_prompt: "",
      prompt: prompt,
      quality: "540p",
      seed: 0,
      water_mark: false
    },
    {
      headers: {
        "API-KEY": process.env.PIXVERSE_API_KEY!,
        "Ai-trace-id": Date.now().toString(),
        "Content-Type": "application/json"
      }
    }
  );

  if (response.data.ErrCode !== 0) {
    throw new Error(response.data.ErrMsg || "Failed to generate video");
  }

  return response.data.Resp;
}

// Function to check video generation status
async function checkVideoStatus(videoId: number): Promise<string> {
  let retries = 0;
  const maxRetries = 30; // Maximum number of retries (30 * 2 seconds = 60 seconds max wait time)
  
  while (retries < maxRetries) {
    const response = await axios.get(
      `https://app-api.pixverse.ai/openapi/v2/video/result/${videoId}`,
      {
        headers: {
          "API-KEY": process.env.PIXVERSE_API_KEY!,
        }
      }
    );

    if (response.data.ErrCode !== 0) {
      throw new Error(response.data.ErrMsg || "Failed to check video status");
    }

    const videoData = response.data.Resp;
    
    // Status 1 means the video is ready
    if (videoData.status === 1 && videoData.url) {
      return videoData.url;
    }
    
    // Wait for 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
    retries++;
  }

  throw new Error("Video generation timed out");
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Step 1: Enhance the prompt using OpenAI
    const enhancedPrompt = await enhancePrompt(prompt);
    console.log("Enhanced prompt:", enhancedPrompt);

    // Step 2: Generate video using Pixverse API
    const { video_id } = await generateVideo(enhancedPrompt);
    console.log("Video generation started with ID:", video_id);

    // Step 3: Check video generation status and get the URL
    const videoUrl = await checkVideoStatus(video_id);
    console.log("Video URL:", videoUrl);

    // Create a response with the video URL and include the enhanced prompt in the headers
    const response = NextResponse.json([videoUrl]);
    response.headers.set('x-enhanced-prompt', enhancedPrompt);
    return response;
  } catch (error: any) {
    console.error("API Error:", error?.response?.data || error.message);
    return NextResponse.json(
      { error: error?.response?.data || error.message },
      { status: 500 }
    );
  }
}
