# Logic Builders

Logic Builders — a RocketRide app.

## What it does

This application manages chargeback review intake, dispute triage, batch CSV upload, review queue workflows, and outcome tracking. It combines the classic Vite app flow from the earlier chargeback-defender prototype with the RocketRide app shell structure for deployment and packaging.

## Development

Open the `.rrapp` file to launch the App Builder: live preview on the Design tab, identity and packaging on the Package tab, publishing on the Deploy tab.

Platform guide for building apps: `.rocketride/docs/ROCKETRIDE_APPS.md` in this workspace.

## App flow

- Upload a CSV of disputes
- Validate required columns and preview the batch
- Process each dispute through the review pipeline
- Approve or reject items in the review queue
- Track case outcomes in the history view

## Legacy Vite setup

This app also preserves the earlier Vite development flow used by the prototype build.

```bash
npm install
npm run vite:dev
```
