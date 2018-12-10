import React, { Component } from 'react';
import {
  Button,
  Collapse,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalHeader,
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
      selectingSeries: null,
      activeStack: null,
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
    const stacks = await download(data[i].uri, this.props.fetchWithAuth);
    data[i].stacks = stacks;
    data[i].state = 'downloaded';
    this.setState({data});
  }

  viewStudy = i => {
    const { data } = this.state;
    const stacks = data[i].stacks;
    const newState = {}
    if (stacks.length === 1) {
      newState.activeStack = stacks[0];
      newState.showList = false;
    }
    else
      newState.selectingSeries = i;
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

  handleSelect = (studyIdx, seriesIdx) => {
    this.setState({
      selectingSeries: null,
      showList: false,
      activeStack: this.state.data[studyIdx].stacks[seriesIdx]
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({data: this.props.data.map(d => ({...d, state: 'initial', stacks: null}))});
    }
  }

  render() {
    const { selectingSeries, showList, data, activeStack } = this.state;
    return (
      <div>
        {(selectingSeries !== null) && <SeriesSelectModal stacks={data[selectingSeries].stacks} cancel={() => this.setState({selectingSeries: null})} select={i => this.handleSelect(selectingSeries, i)}>Select a series to view</SeriesSelectModal>}
        <Navbar color="light" onClick={this.toggle}>Available Studies</Navbar>
        <Collapse isOpen={showList}>
          <StudyTable rows={data} handleAction={this.handleAction} />
        </Collapse>
        <DicomPanel stack={activeStack} />
      </div>
    );
  }
}

class SeriesSelectModal extends Component {
  constructor(props) {
    super(props);
    this.state = {open: true};
  }

  fade(callback) {
    const fadeTime = 300; // !
    setTimeout(callback, fadeTime);
    this.setState({open: false});
  }

  cancel() {
    this.fade(this.props.cancel);
  }

  select(i) {
    this.fade(() => this.props.select(i));
  }

  render() {
    const { open } = this.state;
    const { children, stacks } = this.props;
    return (
      <Modal toggle={() => this.cancel()} isOpen={open} size="lg">
        <ModalHeader>
          {children}
        </ModalHeader>
        <ModalBody>
          <ListGroup>
            {stacks.map((stack, i) =>
              <ListGroupItem key={i} tag="a" href="#" action onClick={() => this.select(i)}>{stack.seriesId}</ListGroupItem>
            )}
          </ListGroup>
        </ModalBody>
      </Modal>
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
          <th># series</th>
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
            <td>{row.nSeries}</td>
            <td>{row.date.toLocaleString()}</td>
            <td>{row.modalities}</td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

export default Studies;
