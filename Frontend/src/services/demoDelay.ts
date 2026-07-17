export async function demoDelay(milliseconds: number): Promise<void> {
  if (milliseconds < 0) {
    throw new Error('Demo delay must be zero or greater.')
  }

  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, milliseconds)
  })
}
