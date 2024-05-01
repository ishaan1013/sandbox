"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, UserPlus, X } from "lucide-react"
import { useState } from "react"
import { Sandbox } from "@/lib/types"
import { Button } from "@/components/ui/button"
import Avatar from "@/components/ui/avatar"

const formSchema = z.object({
  email: z.string().email(),
})

export default function ShareSandboxModal({
  open,
  setOpen,
  data,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  data: Sandbox
}) {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // if (!user.isSignedIn) return
    // const sandboxData = { type: selected, userId: user.user.id, ...values }
    // setLoading(true)
    // const id = await createSandbox(sandboxData)

    console.log(values)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <div className="p-6 pb-3 space-y-6">
          <DialogHeader>
            <DialogTitle>Share Sandbox</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mr-4 w-full">
                    <FormControl>
                      <Input
                        placeholder="yourfriend@domain.com"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={loading} type="submit" className="">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Share
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
        <div className="w-full h-[1px] bg-border" />
        <div className="p-6 pt-3">
          <DialogHeader className="mb-6">
            <DialogTitle>Manage Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar name="Ishaan Dey" className="mr-2" />
                Ishaan Dey
              </div>
              <Button variant="ghost" size="smIcon">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
