import React from "react";

import get from "lodash.get";
import moment from "moment";

import { PopoverTip2 } from "../PopoverTips.jsx";

const Header = ({ demographics }) => {
  let name, birthday, city;

  if (demographics) {
    const fhirName = get(demographics, "name.0");
    if (fhirName !== undefined)
      name = fhirName.given.join(" ") + " " + fhirName.family;

    if (demographics.birthDate)
      birthday = moment(demographics.birthDate).format("MM-DD-YYYY");

    const fhirAddress = get(demographics, "address.0");
    if (fhirAddress !== undefined) {
      city = `${fhirAddress.city}, ${fhirAddress.state}`;
    }
  }

  const elements = [name, birthday && `DOB: ${birthday}`, city].filter(x => x);

  return (
    <div style={{ margin: "20px" }}>
      <h1>S4S Imaging Demo Application</h1>
      <h5>
        {elements.join(" | ")}
        <PopoverTip2 />
      </h5>
    </div>
  );
};

export default Header;
