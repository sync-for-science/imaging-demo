import React, { Component } from "react";
import {
  Badge,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalHeader
} from "reactstrap";

class SeriesSelectModal extends Component {
  constructor(props) {
    super(props);
    this.state = { open: true };
  }

  fade(callback) {
    const fadeTime = 300; // should get fade time from reactstrap somewhere
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

export default SeriesSelectModal;
