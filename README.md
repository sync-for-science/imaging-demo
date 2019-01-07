# S4S Imaging Demo Application

[Live demo](https://imaging.demo.syncfor.science/)

This browser-based React app demonstrates how an application can retrieve DICOM imaging data from a user's patient portal and render it interactively, in this case with the [Cornerstone library](https://github.com/cornerstonejs/cornerstone). The user's health record vendor should provide a clinical data FHIR endpoint as well as an imaging data FHIR endpoint (a reference implementation of this stack is available [here](https://github.com/sync-for-science/s4s-imaging-stack)).

Features include:
- Developer tips to highlight interesting implementation details
- Optional dynamic OAuth client registration
- Client credentials saved to the browser for future use
- Authorization tokens saved to the session
- Authorization revocation
- Automatic access token refreshing based on expiry time
- Retrieval of patient demographic data from the clinical data FHIR server
- Retrieval of a list of imaging studies from the imaging data FHIR server
- Asynchronous download and review of individual studies from the imaging data server
- Simple interaction with rendered DICOM data, including pan, zoom and brightness
- Playback controls for multiframe DICOM data

## Installation

To install with `yarn`:
```bash
~/imaging$ yarn
```

## Developing

To run a development server:
```bash
~/imaging$ yarn start
```
While this is running, changes the source will be automatically compiled and the app will be refreshed in the browser.

To package the sources:
```bash
~/imaging$ yarn build
```
