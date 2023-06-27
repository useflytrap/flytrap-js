## Flytrap Express Demo

This is a basic Express API app which demonstrates the capture and replay functionality of Flytrap.

To try out the demo, first [create a project](https://useflytrap.com/projects/create), then copy the configuration given by the Flytrap dashboard into the `flytrap.config.ts` file.

Build and run the Express API:

```bash
pnpm build && node dist/index.cjs
```

Then, run the demo bash script. The bash script `curl`:s the API causing an error, which gets sent to the Flytrap API. After that, you can view the captured error in the Flytrap Dashboard.

1. Run the demo
```bash
$ bash demo.sh
```

## 🐛 Replay the bug

To replay the bug you have just captured, head over to the Flytrap Dashboard, and copy the `captureId` value. Place the `captureId` in your `flytrap.config.ts`, and change the `mode` from `'capture'` to `'replay'`.

```typescript
export default defineFlytrapConfig({
	projectId: 'flytrap-nextjs-demo',
	publicApiKey: 'pk_MIIBI...',
	privateKey: 'sk_MIIEv...',
	secretApiKey: 'sk_lLSJJicAKC2gSLAj1BERqNTO3sOWFy3jpeaCCyi1AiTT-Vlr',
	captureId: 'c8a29ce0-c729-4d80-906f-6ab0c4ee0e65', // 👈 enter capture here
	mode: 'replay' // 👈 put mode as 'replay'
})
```

Due to safeguards in Flytrap preventing you from pushing a configuration that has replaying enabled when `NODE_ENV === production`, we must re-build with `NODE_ENV=development`.

Re-run the build with development environment, and run:

```bash
$ NODE_ENV=development pnpm build && node dist/index.cjs
```

Now, you can try a valid PUT statement like below, and your bug will be reproduced like magic. Now you can easily find the root of the problem!

```bash
$ curl -X PUT -H "Content-Type: application/json" -d '{"title": "Updated Todo", "completed": true}' http://localhost:3000/todos/1
```

## Learn More

To learn more about Flytrap, take a look at the following resources:

- [Flytrap Documentation](https://docs.useflytrap.com) - learn about Flytrap and its features
