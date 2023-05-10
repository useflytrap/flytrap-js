This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Flytrap NextJS Demo

This is a basic NextJS app which demonstrates the capture and replay functionality of Flytrap.

To try out the demo, first [create a project](https://useflytrap.com/projects/create), then copy the configuration given by the Flytrap dashboard into the `flytrap.config.js` file.

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Next up, enter the value "wrong" in the input field on the home page, and click on the "Submit" button.

Head over to the dashboard, where you will notice your error being captured. 🎉

## 🐛 Replay the bug

To replay the bug you have just captured, head over to the Flytrap Dashboard, and copy the `captureId` value. Place the `captureId` in your `flytrap.config.js`, and change the `mode` from `'capture'` to `'replay'`.

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

NextJS caches our Flytrap configuration file, so whenever we make changes to the Flytrap configuration in NextJS, we must clear the NextJS cache. Clear your cache by deleting the `.next` folder by running the command `rm -r .next`. Then, run the development server.

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Now, you can type in any value to the input field, and submit any value, and like magic✨, the values of our user pop up, and we can easily find the root of the problem!

## Learn More

To learn more about Flytrap, take a look at the following resources:

- [Flytrap Documentation](https://docs.useflytrap.com) - learn about Flytrap and its features
