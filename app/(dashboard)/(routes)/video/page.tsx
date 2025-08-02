"use client";

import React, { useState } from "react";
import { VideoIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import Heading from "@/components/heading";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/empty";
import { Loader } from "@/components/loader";
import { Card, CardContent } from "@/components/ui/card";

import { useProModal } from "@/hooks/use-pro-modal";

import { formSchema } from "./constants";

export default function VideoPage() {
  const proModal = useProModal();
  const router = useRouter();
  const [video, setVideo] = useState<string>();
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: ""
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setVideo(undefined);
      setEnhancedPrompt("");
      setIsEnhancing(true);
      
      // First, show that we're enhancing the prompt
      toast.success("Enhancing your prompt for better video generation...");
      
      // Then show we're generating the video
      setIsEnhancing(false);
      setIsGenerating(true);
      toast.success("Generating your video with Pixverse AI...");
      
      const response = await axios.post("/api/video", values);
      
      // Extract the enhanced prompt from the response headers if available
      const enhancedPromptHeader = response.headers['x-enhanced-prompt'];
      if (enhancedPromptHeader) {
        setEnhancedPrompt(enhancedPromptHeader);
      }
      
      setVideo(response.data[0]);
      toast.success("Video generated successfully!");
      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 403) proModal.onOpen();
      else toast.error(error?.response?.data?.error || "Something went wrong.");
    } finally {
      setIsGenerating(false);
      router.refresh();
    }
  };

  return (
    <div>
      <Heading
        title="Video Generation"
        description="Turn your prompt to video."
        icon={VideoIcon}
        iconColor="text-orange-700"
        bgColor="bg-orange-700/10"
      />
      <div className="px-4 lg:px-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="rounded-lg border w-full p-4 px-3 md:px-6 focus-within:shadow-sm grid grid-cols-12 gap-2"
            >
              <FormField
                name="prompt"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <FormControl className="m-0 p-0">
                      <Input
                        disabled={isLoading}
                        placeholder="Clown fish swimming around a coral reef"
                        className="pl-2 border-0 outline-none focus-visible:ring-0 focus-visible: ring-transparent"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                disabled={isLoading}
                className="col-span-12 lg:col-span-2 w-full"
              >
                Generate
              </Button>
            </form>
          </Form>
        </div>
        <div className="space-y-4 mt-4">
          {(isLoading || isEnhancing || isGenerating) && (
            <div className="p-8 rounded-lg w-full flex flex-col items-center justify-center bg-muted">
              <Loader />
              <p className="text-sm text-muted-foreground mt-2">
                {isEnhancing ? "Enhancing your prompt..." : isGenerating ? "Generating your video with Pixverse AI..." : "Processing..."}
              </p>
            </div>
          )}
          {!video && !isLoading && !isEnhancing && !isGenerating && <Empty label="No Video Generated Yet." />}
          {enhancedPrompt && video && (
            <Card className="bg-muted/50 border-0">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Enhanced Prompt:</h3>
                <p className="text-sm text-muted-foreground">{enhancedPrompt}</p>
              </CardContent>
            </Card>
          )}
          {video && (
            <video
              controls
              className="w-full aspect-video rounded-lg border bg-black my-4"
            >
              <source src={video} />
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
