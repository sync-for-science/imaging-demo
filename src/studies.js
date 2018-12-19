import React, { Component } from "react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  CardText,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalHeader
} from "reactstrap";
import CircularProgress from "@material-ui/core/CircularProgress";
import moment from "moment";

class Studies extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectingSeries: null,
      activeSeries: null,
      data: []
    };
  }

  downloadStudy = async i => {
    const { data } = this.state;
    data[i].state = "downloading";
    this.setState({ data });
    await data[i].study.download(this.props.fetchWithAuth);
    data[i].state = "downloaded";
    this.setState({ data });
  };

  viewStudy = i => {
    const { data } = this.state;
    const study = data[i].study;
    if (study.series.length === 1) this.props.setActiveSeries(study.series[0]);
    else this.setState({ selectingSeries: i });
  };

  handleAction = async i => {
    const { data } = this.state;
    if (data[i].state === "initial") {
      this.downloadStudy(i);
    } else if (data[i].state === "downloaded") {
      this.viewStudy(i);
    }
  };

  handleSelect = (studyIdx, seriesIdx) => {
    this.setState({ selectingSeries: null });
    this.props.setActiveSeries(
      this.state.data[studyIdx].study.series[seriesIdx]
    );
  };

  componentDidUpdate(prevProps) {
    if (prevProps.studies !== this.props.studies) {
      this.setState({
        data: this.props.studies.map(d => ({ study: d, state: "initial" }))
      });
    }
  }

  render() {
    const { selectingSeries, data } = this.state;
    return (
      <div>
        {selectingSeries !== null && (
          <SeriesSelectModal
            series={data[selectingSeries].study.series}
            cancel={() => this.setState({ selectingSeries: null })}
            select={i => this.handleSelect(selectingSeries, i)}
          >
            Select a series to view for{" "}
            <b>{data[selectingSeries].study.description}</b>
          </SeriesSelectModal>
        )}
        <StudyCards cards={data} handleAction={this.handleAction} />
      </div>
    );
  }
}

class SeriesSelectModal extends Component {
  constructor(props) {
    super(props);
    this.state = { open: true };
  }

  fade(callback) {
    const fadeTime = 300; // !
    setTimeout(callback, fadeTime);
    this.setState({ open: false });
  }

  cancel() {
    this.fade(this.props.cancel);
  }

  select(i) {
    this.fade(() => this.props.select(i));
  }

  render() {
    const { open } = this.state;
    const { children, series } = this.props;
    return (
      <Modal toggle={() => this.cancel()} isOpen={open}>
        <ModalHeader>{children}</ModalHeader>
        <ModalBody>
          <ListGroup>
            {series.map((s, i) => (
              <ListGroupItem
                key={i}
                tag="a"
                href="#"
                action
                onClick={() => this.select(i)}
              >
                {s.description} <Badge>{s.modality}</Badge>
              </ListGroupItem>
            ))}
          </ListGroup>
        </ModalBody>
      </Modal>
    );
  }
}

const StudyCards = ({ cards, handleAction }) =>
  cards.map(({ study, state }, i) => (
    <Card key={i} body style={{ position: "relative" }}>
      <CardTitle>
        Study #{i + 1}
        {study.description && " - " + study.description}
        {study.modalities.map((m, i) => (
          <Badge key={i}>{m}</Badge>
        ))}
      </CardTitle>
      <CardText>
        {study.date && moment(study.date).format("MMMM YYYY")}
        <br />
        {study.nSeries} series
      </CardText>
      <Button
        onClick={() => handleAction(i)}
        disabled={state === "downloading"}
        style={{
          position: "relative"
        }}
      >
        {state === "downloaded" ? "Review" : "Download"}
        {state === "downloading" && (
          <CircularProgress
            size={24}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-12px",
              marginLeft: "-12px",
              color: "#332f7b"
            }}
          />
        )}
      </Button>
    </Card>
  ));

export default Studies;
