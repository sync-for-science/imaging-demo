# Imaging demo

- [x] Dynamic client registration
- [x] OAuth 2.0 workflow in new window/tab with BroadcastChannel API
- [x] Authorization code exchange
- [x] ImagingStudy retrieval from FHIR server
- [x] DICOM data display with limited interaction
- [ ] Error handling
- [ ] User interface
- [ ] Handling of multiple studies and series
- [ ] Choice of preset clients or dynamic client registration
- [ ] Choice of preset or user-provided authentication endpoints
- [ ] Display data from basic patient demographics
- [ ] Handle 503

## Installation

To install with `yarn`:
```bash
~/imaging$ yarn
```

## Developing

To run a development server:
```bash
~/imaging$ npx http-server dist
```

To package the sources:
```bash
~/imaging$ yarn build
```
