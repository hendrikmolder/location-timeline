# timeline

Calculates days spend in a country based on Google Maps timeline.

## Usage

1. Export timeline data from [Google Takeout](https://takeout.google.com/settings/takeout/custom/location_history).
2. Sign up/in to Mapquest and [obtain an API token](https://developer.mapquest.com/user/me/apps).

```bash
yarn start --file=<recordsFile> --token=<mapQuestToken>
```

For example

```bash
yarn start --file=./Records.json --token=some-token 
```