const Redirect = props => {
  const queryParams = new URLSearchParams(props.location.search);
  const state = queryParams.get("state");
  const code = queryParams.get("code");
  const bc = new BroadcastChannel(state);
  bc.postMessage(code);
  bc.close();
  return "";
};

export default Redirect;
