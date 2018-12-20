import React, { Component, Fragment } from "react";
import { FormFeedback, Input } from "reactstrap";

import debounce from "lodash.debounce";

class ValidatedFHIRInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      valid: false,
      invalid: false
    };
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    if (value !== prevProps.value) {
      this.setState({
        valid: false,
        invalid: false
      });
      this.checkUri(value);
    }
  }

  componentWillUnmount() {
    this.checkUri.cancel();
  }

  checkUri = debounce(async uri => {
    if (!uri) return;
    let ok = false;
    if (/https?:\/\//.test(uri)) {
      try {
        const response = await fetch(`${uri}/metadata`);
        if (response.ok) ok = true;
      } catch {} // not a big deal if it's broken
    }
    if (ok) this.setState({ valid: true });
    else this.setState({ invalid: true });
  }, 500);

  render() {
    const { onChange, ...otherProps } = this.props;
    const { valid, invalid } = this.state;
    return (
      <Fragment>
        <Input
          {...otherProps}
          type="text"
          valid={valid}
          invalid={invalid}
          onChange={e => onChange(e.target.value)}
        />
        {invalid && (
          <FormFeedback>Please input a valid FHIR base URI</FormFeedback>
        )}
      </Fragment>
    );
  }
}

export default ValidatedFHIRInput;
