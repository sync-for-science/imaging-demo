import React from "react";
import { Badge, Button, Card, CardText, CardTitle } from "reactstrap";

import CircularProgress from "@material-ui/core/CircularProgress";
import moment from "moment";

import { PopoverTip4 } from "../PopoverTips.jsx";

const StudyCards = ({ cards, handleAction }) =>
  cards.map(({ study, state }, i) => {
    const cardInfo = [];
    if (study.date)
      cardInfo.push(`Date: ${moment(study.date).format("MMMM YYYY")}`);
    if (study.referringPhysician)
      cardInfo.push(`Physician: ${study.referringPhysician}`);
    cardInfo.push(`Number of series: ${study.nSeries}`);

    return (
      <Card key={i} body style={{ position: "relative" }}>
        <CardTitle>
          Study #{i + 1}
          {study.description && ` - ${study.description}`}
          {study.modalities.map((m, i) => (
            <Badge key={i}>{m}</Badge>
          ))}
          <PopoverTip4 />
        </CardTitle>
        <CardText>
          {cardInfo.map((card, i) => [
            card, (i < cardInfo.length - 1) && <br />
          ])}
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
    );
  });

export default StudyCards;
