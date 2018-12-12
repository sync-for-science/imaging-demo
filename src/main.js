import React, { Component } from "react";
import { Navbar, NavbarBrand } from "reactstrap";
import Authenticator from "./authenticator.js";
import Dashboard from "./dashboard.js";
import "./styles/index.scss";
import logo from "./logo.png";

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clinicalUri: "https://portal-stu3.demo.syncfor.science/api/fhir",
      imagingUri: "https://imaging-broker.demo.syncfor.science/baseDstu3",
      auth: null
    };
  }

  render() {
    const { clinicalUri, imagingUri, auth } = this.state;
    let component;
    if (!auth)
      component = (
        <Authenticator
          clinicalUri={clinicalUri}
          imagingUri={imagingUri}
          setAuth={auth => this.setState({ auth })}
        />
      );
    else
      component = (
        <Dashboard
          clinicalUri={clinicalUri}
          imagingUri={imagingUri}
          auth={auth}
        />
      );
    return (
      <div>
        <Navbar style={{ background: "#332F7B" }}>
          <NavbarBrand>
            <img src={logo} height="50px" alt="S4S logo" />
          </NavbarBrand>
        </Navbar>
        {component}
      </div>
    );
  }
}

export default Main;
