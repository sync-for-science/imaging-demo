import React, { Component } from "react";

import { PopoverTip3 } from "../PopoverTips.jsx";
import SeriesSelectModal from "./SeriesSelectModal.jsx";
import StudyCards from "./StudyCards.jsx";

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
      const studies = this.props.studies.map(d => ({
        study: d,
        state: "initial"
      }));
      studies.sort((s1, s2) => s2.study.date - s1.study.date); // most recent first
      this.setState({
        data: studies
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
        {data.length > 0 && (
          <h4 style={{ textAlign: "center" }}>
            Available Studies <PopoverTip3 />
          </h4>
        )}
        <StudyCards cards={data} handleAction={this.handleAction} />
      </div>
    );
  }
}

export default Studies;
