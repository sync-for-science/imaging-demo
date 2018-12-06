import React, { Component } from 'react';
import {
  Button,
  Collapse,
  Navbar,
  Table
} from 'reactstrap';
import CircularProgress from '@material-ui/core/CircularProgress';
import DicomPanel, { download } from './dicom.js';

class Studies extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showList: true,
      activeImageId: null,
      data: []
    };
  }

  toggle = () => {
    this.setState({showList: !this.state.showList});
  }

  downloadStudy = async i => {
    const { data } = this.state;
    data[i].state = 'downloading';
    this.setState({data});
    const imageId = await download(data[i].uri, this.props.fetchWithAuth);
    data[i].imageId = imageId;
    data[i].state = 'downloaded';
    this.setState({data});
  }

  viewStudy = i => {
    const { data, showList } = this.state;
    const newState = {activeImageId: data[i].imageId};
    if (showList) {
      newState.showList = false;
    }
    this.setState(newState);
  }

  handleAction = async i => {
    const { data } = this.state;
    if (data[i].state === 'initial') {
      this.downloadStudy(i);
    } else if (data[i].state === 'downloaded') {
      this.viewStudy(i);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({data: this.props.data.map(d => ({...d, state: 'initial', imageId: null}))});
    }
  }

  render() {
    return (
      <div>
        <Navbar color="light" onClick={this.toggle}>Available Studies</Navbar>
        <Collapse isOpen={this.state.showList}>
          <StudyTable rows={this.state.data} handleAction={this.handleAction} />
        </Collapse>
        <DicomPanel imageId={this.state.activeImageId} />
      </div>
    );
  }
}

const StudyTable = props => {
  return (
    <Table hover className="text-center" size="sm">
      <thead>
        <tr>
          <th style={{width: '150px'}} />
          <th>Accession</th>
          <th>Date</th>
          <th>Modality</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row, i) =>
          <tr key={i}>
            <td style={{position: 'relative'}}>
              <Button onClick={() => props.handleAction(i)} disabled={row.state === 'downloading'}>
                {row.state === 'downloaded' ? 'View' : 'Download'}
              </Button>
              {row.state === 'downloading' && <CircularProgress size={24} style={{position: 'absolute', top: '50%', left: '50%', marginTop: -12, marginLeft: -12}} />}
            </td>
            <td>{row.accession}</td>
            <td>{row.date.toLocaleString()}</td>
            <td>{row.modalities}</td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

export default Studies;
