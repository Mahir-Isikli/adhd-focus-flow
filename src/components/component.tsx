/**
* This code was generated by v0 by Vercel.
* @see https://v0.dev/t/7H3qvIdnMGS
* Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
*/

/** Add fonts into your Next.js project:

import { Inter } from 'next/font/google'

inter({
  subsets: ['latin'],
  display: 'swap',
})

To read more about using these font, please visit the Next.js documentation:
- App Directory: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
- Pages Directory: https://nextjs.org/docs/pages/building-your-application/optimizing/fonts
**/
"use client";

import React, { useState, useEffect, useRef } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Mic, MicOff, Search } from 'lucide-react';
import VoiceInputView from './VoiceInputView';

// Import other necessary components and icons

interface Task {
  id: number;
  title: string;
  completed: boolean;
  subtasks: { id: number; title: string; completed: boolean }[];
}

export function Component() {
  const [tasks, setTasks] = useState<Task[]>([
    // Initial tasks here
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Pomodoro Timer State
  const [time, setTime] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((time) => time - 1);
      }, 1000);
    } else if (time === 0) {
      if (isBreak) {
        setTime(25 * 60); // Reset to 25 minutes
        setIsBreak(false);
      } else {
        setTime(5 * 60); // Set to 5 minutes break
        setIsBreak(true);
      }
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time, isBreak]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setTime(25 * 60);
    setIsActive(false);
    setIsBreak(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const breakDownTask = async (taskInput: string) => {
    console.log('breakDownTask called with input:', taskInput);
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    console.log('API Key:', apiKey);

    const prompt = `You are a task management assistant. Your only job is to break down tasks into subtasks and return them strictly in JSON format. Do not provide any explanation or additional text. Only respond with a JSON object containing a 'task' field and a 'subtasks' array of strings. Use this input to break down the task: ${taskInput}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama3-groq-8b-8192-tool-use-preview",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      console.log('API Response:', response);
      const data = await response.json();
      console.log('API Data:', data);

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('API Content:', content);
        const result = JSON.parse(content);
        console.log('Parsed Result:', result);
        return result;
      } else {
        console.error('Unexpected API response structure:', data);
        return null;
      }
    } catch (error) {
      console.error('Error calling Groq API:', error);
      return null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        setAudioBlob(audioBlob);
        await transcribeAudio(audioBlob);
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-large-v3");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        console.log("Transcribed text:", data.text);
        setNewTaskTitle(data.text);
        await addTask(data.text); // Call addTask with the transcribed text
      } else {
        console.error("No text in transcription response:", data);
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  };

  const addTask = async (taskTitle?: string) => {
    const titleToAdd = taskTitle || newTaskTitle;
    console.log('addTask called with taskTitle:', titleToAdd);
    if (titleToAdd.trim()) {
      try {
        console.log('Calling breakDownTask');
        const brokenDownTasks = await breakDownTask(titleToAdd);
        console.log('breakDownTask result:', brokenDownTasks);
        if (brokenDownTasks && brokenDownTasks.subtasks) {
          const newTask: Task = {
            id: Date.now(),
            title: brokenDownTasks.task || titleToAdd,
            completed: false,
            subtasks: brokenDownTasks.subtasks.map((subtask: string, index: number) => ({
              id: Date.now() + index + 1,
              title: subtask,
              completed: false,
            })),
          };
          setTasks(prevTasks => [...prevTasks, newTask]);
          setNewTaskTitle("");
        } else {
          console.error('Invalid response from Groq API');
          // Fallback if API call fails or returns invalid data
          setTasks(prevTasks => [...prevTasks, { id: Date.now(), title: titleToAdd, completed: false, subtasks: [] }]);
          setNewTaskTitle("");
        }
      } catch (error) {
        console.error('Error in addTask:', error);
        // Fallback if API call throws an error
        setTasks(prevTasks => [...prevTasks, { id: Date.now(), title: titleToAdd, completed: false, subtasks: [] }]);
        setNewTaskTitle("");
      }
    }
  };

  const toggleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const toggleSubtaskCompletion = (taskId: number, subtaskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            subtasks: task.subtasks.map(subtask => 
              subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
            ),
            completed: task.subtasks.every(subtask => subtask.completed || subtask.id === subtaskId)
          }
        : task
    ));
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    // You might need to add logic to actually apply the theme to your app
  };

  return (
    <div className={`flex flex-col h-screen bg-background text-foreground transition-colors duration-200 ${theme === "dark" ? "dark" : ""}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border elevation-2">
        <h1 className="text-xl font-bold md:text-2xl">ADHD Task Tracker</h1>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </Button>
            </DropdownMenuTrigger>
            {/* ... rest of the dropdown menu */}
          </DropdownMenu>
          {/* ... other header buttons */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 gap-8 p-8 md:grid-cols-[1fr_300px] overflow-auto">
        <div className="flex flex-col gap-6">
          {/* Task input */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full flex items-center">
              {isRecording ? (
                <VoiceInputView isRecording={isRecording} />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                type="text"
                placeholder={isRecording ? "" : "What can I help you break down today?"}
                className="pl-10 pr-20 w-full h-12 text-sm md:text-base"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTask()}
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2"
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => addTask()}
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Task list */}
          <div className="grid gap-2">
            {tasks.map(task => (
              <Card key={task.id} className="p-4 elevation-1 hover:elevation-2 transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskCompletion(task.id)} />
                    <p className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ExpandIcon className="w-5 h-5" />
                  </Button>
                </div>
                {task.subtasks.length > 0 && (
                  <div className="mt-2 grid gap-1 pl-6">
                    {task.subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-3">
                        <Checkbox 
                          checked={subtask.completed} 
                          onCheckedChange={() => toggleSubtaskCompletion(task.id, subtask.id)} 
                        />
                        <p className={subtask.completed ? "line-through text-muted-foreground" : ""}>{subtask.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Pomodoro Timer */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Card className="p-4 flex flex-col items-center justify-center w-full md:w-[300px] elevation-3">
            <div className="text-6xl font-bold">{formatTime(time)}</div>
            <div className="text-muted-foreground">
              {isBreak ? "Break Time" : "Pomodoro Timer"}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <Button variant="ghost" size="icon" onClick={toggleTimer}>
                {isActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={resetTimer}>
                <CircleStopIcon className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function CircleStopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <rect width="6" height="6" x="9" y="9" />
    </svg>
  )
}


function ExpandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8" />
      <path d="M3 16.2V21m0 0h4.8M3 21l6-6" />
      <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6" />
      <path d="M3 7.8V3m0 0h4.8M3 3l6 6" />
    </svg>
  )
}


function HandHelpingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14" />
      <path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 13 6 6" />
    </svg>
  )
}


function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}


function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}


function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  )
}


function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}


function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}


function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}


function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}
