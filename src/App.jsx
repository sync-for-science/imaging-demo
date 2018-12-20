import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Main from "./Main.jsx";
import Redirect from "./Redirect.jsx";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/redirect" component={Redirect} />
        <Route path="/" component={Main} />
      </Switch>
    </Router>
  );
};

export default App;
