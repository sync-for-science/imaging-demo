import React, { Component } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  Nav,
  NavItem,
  NavLink,
  Navbar,
  NavbarBrand
} from "reactstrap";
import Authenticator from "./authenticator.js";
import Dashboard from "./dashboard.js";
import "./styles/index.scss";
import logo from "./logo.png";
import githubLogo from "./github.svg";
import { refreshAuthToken } from "./oauth.js";

class Main extends Component {
  constructor(props) {
    super(props);

    let clinicalUri, imagingUri, auth;
    if (sessionStorage.getItem("auth")) {
      clinicalUri = sessionStorage.getItem("clinicalUri");
      imagingUri = sessionStorage.getItem("imagingUri");
      auth = JSON.parse(sessionStorage.getItem("auth"));
    }

    this.state = {
      clinicalUri,
      imagingUri,
      auth,
      showModal: false,
      refreshTimerId: null
    };

    if (auth)
      this.setRefreshTimer(
        auth.refreshUri,
        auth.expires,
        auth.refreshToken,
        auth.client
      );
  }

  setAuth = (clinicalUri, imagingUri, auth) => {
    this.setState({ clinicalUri, imagingUri, auth });
    sessionStorage.setItem("clinicalUri", clinicalUri);
    sessionStorage.setItem("imagingUri", imagingUri);
    sessionStorage.setItem("auth", JSON.stringify(auth));
    this.setRefreshTimer(
      auth.refreshUri,
      auth.expires,
      auth.refreshToken,
      auth.client
    );
  };

  revokeAuth = () => {
    sessionStorage.removeItem("clinicalUri");
    sessionStorage.removeItem("imagingUri");
    sessionStorage.removeItem("auth");
    this.clearRefreshTimer();
    this.setState({
      clinicalUri: null,
      imagingUri: null,
      auth: null,
      showModal: true,
      refreshTimerId: null
    });
  };

  clearRefreshTimer() {
    const { refreshTimerId } = this.state;
    if (refreshTimerId) clearTimeout(refreshTimerId);
  }

  setRefreshTimer = (tokenUri, expiryTime, token, client) => {
    if (!expiryTime || !token) return;
    const when = expiryTime - new Date().getTime() - 30000; // 30 seconds before expiration
    this.clearRefreshTimer();
    const { clinicalUri, imagingUri } = this.state;
    let auth;
    const refreshTimerId = setTimeout(async () => {
      try {
        auth = await refreshAuthToken(tokenUri, client, token);
      } catch {
        this.setState({
          error: "Could not refresh authorization token"
        });
      }
      this.setAuth(clinicalUri, imagingUri, auth);
    }, when);
    this.setState({ refreshTimerId });
  };

  componentWillUnmount() {
    this.clearRefreshTimer();
  }

  render() {
    const { clinicalUri, imagingUri, auth, showModal } = this.state;
    let component;
    if (!auth) component = <Authenticator setAuth={this.setAuth} />;
    else
      component = (
        <Dashboard
          clinicalUri={clinicalUri}
          imagingUri={imagingUri}
          auth={auth}
          revokeAuth={this.revokeAuth}
          refreshAuth={this.refreshAuth}
        />
      );
    return (
      <div style={{ marginBottom: "50px" }}>
        <Modal isOpen={showModal} centered={true}>
          <ModalBody>
            Your authorization token has expired or was revoked. Please
            reauthenticate.
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => this.setState({ showModal: false })}
              color="primary"
            >
              Got it
            </Button>
          </ModalFooter>
        </Modal>
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
