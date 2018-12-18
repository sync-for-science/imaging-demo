import React, { Component } from "react";
import { Navbar, NavbarBrand } from "reactstrap";
import Authenticator from "./authenticator.js";
import Dashboard from "./dashboard.js";
import "./styles/index.scss";
import logo from "./logo.png";
import githubLogo from "./github.svg";

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clinicalUri: null,
      imagingUri: null,
      auth: null
    };
  }

  render() {
    const { clinicalUri, imagingUri, auth } = this.state;
    let component;
    if (!auth)
      component = (
        <Authenticator
          setState={(clinicalUri, imagingUri, auth) =>
            this.setState({ clinicalUri, imagingUri, auth })
          }
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
          <Nav navbar style={{ marginRight: "50px" }}>
            <NavItem>
              <NavLink
                href="https://github.com/sync-for-science/imaging-demo"
                target="_blank"
              >
                <img src={githubLogo} width="25px" height="25px" />
              </NavLink>
            </NavItem>
          </Nav>
        </Navbar>
        {component}
      </div>
    );
  }
}

export default Main;
