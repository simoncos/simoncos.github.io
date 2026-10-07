// Structures of the retained research data; the imported JSON is checked against these contracts.
export type DATA = {
  "all_tag_impact": Record<string, {
      "diff_vs_baseline": number;
      "diff_vs_without": number;
      "n_with": number;
      "with_mean": number;
      "without_mean": number;
    }>;
  "bedtime_hist": Record<string, Record<string, number>>;
  "bedtime_median": Record<string, number>;
  "bedtime_quality_hist": Record<string, Record<string, number>>;
  "curated_tag_impact": Record<string, {
      "diff_vs_baseline": number;
      "diff_vs_without": number;
      "n_with": number;
      "with_mean": number;
      "without_mean": number;
    }>;
  "curated_tags": Array<string>;
  "dow_avg": {
    "Fri": number;
    "Mon": number;
    "Sat": number;
    "Sun": number;
    "Thu": number;
    "Tue": number;
    "Wed": number;
  };
  "hp_timeline": Record<string, {
      "n": number;
      "rate": number;
    }>;
  "monthly_avg": Record<string, number>;
  "mood_by_year": Record<string, {
      "Bad": number;
      "Good": number;
      "Not set"?: number;
      "OK": number;
    }>;
  "scatter": Array<{
      "bedtime": number;
      "date": string;
      "duration": number;
      "mood": string;
      "quality": number;
      "tags": Array<string>;
      "year": number;
    }>;
  "tag_impact": Record<string, {
      "diff": number;
      "n_with": number;
      "with_mean": number;
      "without_mean": number;
    }>;
  "total_records": number;
  "yearly_summary": Record<string, {
      "bedtime_mean": number;
      "duration_mean": number;
      "n": number;
      "quality_mean": number;
      "quality_std": number;
      "regularity_mean": number;
    }>;
};

export type DATA2 = {
  "monthly": Record<string, {
      "asleep": number;
      "bad_pct": number;
      "bedtime": number;
      "good_pct": number;
      "n": number;
      "ok_pct": number;
    }>;
  "reg_bd": {
    "intercept": number;
    "n": number;
    "r2": number;
    "slope": number;
    "x_sample": Array<number>;
  };
  "reg_snore": {
    "intercept": number;
    "n": number;
    "r2": number;
    "slope": number;
    "x_sample": Array<number>;
  };
  "timeline": Array<{
      "asleep_h": number;
      "bd": number | null;
      "cough": number | null;
      "date": string;
      "quality": number;
      "resp": number | null;
      "snore_min": number;
      "year": number;
      "ym": string;
    }>;
  "yearly_full": Record<string, {
      "asleep_h_mean": number;
      "asleep_h_n": number;
      "bd_mean": number | null;
      "bd_n": number;
      "cough_mean": number | null;
      "cough_n": number;
      "deep_pct_mean": number;
      "deep_pct_n": number;
      "hr_mean": number;
      "hr_n": number;
      "mov_mean": number;
      "mov_n": number;
      "quality_mean": number;
      "quality_n": number;
      "resp_mean": number | null;
      "resp_n": number;
      "snore_min_mean": number;
      "snore_min_n": number;
      "snore_pct_mean": number;
      "snore_pct_n": number;
      "snore_prevalence": number;
      "year": number;
    }>;
};

export type DATA3 = {
  "monthly_cmp": Record<string, {
      "adjusted": number | null;
      "asleep_h": number;
      "mood_adjusted": number;
      "quality": number;
    }>;
};

export type DATA4 = Record<string, {
    "hp_pct": number;
    "snore_pct": number;
    "total": number;
  }>;

export type DATA5 = Record<string, {
    "bd": number;
    "q": number;
    "snore": number;
  }>;

type Data6Base = {
  "monthly": Record<string, {
      "asleep": number;
      "bad_pct": number;
      "bedtime": number;
      "good_pct": number;
      "late_pct": number;
      "long_pct": number;
      "n": number;
      "ok_pct": number;
      "q": number;
      "regularity_mean": number;
      "short_pct": number;
    }>;
  "monthly_latency": Record<string, number>;
  "streaks": {
    "best": {
      "days": number;
      "end": string;
      "start": string;
    };
    "worst": {
      "days": number;
      "end": string;
      "start": string;
    };
  };
  "yearly": Record<string, {
      "asleep": number;
      "bad_pct": number;
      "bedtime": number;
      "good_pct": number;
      "late_pct": number;
      "long_pct": number;
      "n": number;
      "ok_pct": number;
      "q": number;
      "regularity_mean": number;
      "short_pct": number;
    }>;
  "yearly_latency": Record<string, number>;
};

export type DATA7 = {
  "short_sleep": {
    "baseline_quality": number;
    "bins": Array<{
        "label": string;
        "mean_quality": number;
        "n": number;
        "pct": number;
      }>;
    "counting_mode": string;
    "counting_note": string;
    "representative_record": string;
    "thresholds": Record<string, {
        "diff_vs_other": number;
        "mean_quality": number;
        "n": number;
        "other_quality": number;
        "pct": number;
      }>;
    "yearly_baseline_quality": Record<string, number>;
    "yearly_under7_pct": Record<string, number>;
    "yearly_under7_quality": Record<string, number>;
  };
  "travel": {
    "delta": number;
    "mean_with": number;
    "mean_without": number;
    "nights": number;
    "yearly_pct": Record<string, number>;
    "yearly_qual": Record<string, number | null>;
  };
};

export type DATA8 = {
  "events": Record<string, {
      "delta": number;
      "mean_with": number;
      "mean_without": number;
      "n": number;
      "yearly_pct": Record<string, number>;
      "yearly_qual": Record<string, number>;
    }>;
  "fly_co": Array<{
      "delta": number;
      "tag": string;
    }>;
  "hp_counts": Record<string, number>;
  "night_gaming_segments": Array<{
      "bad": number;
      "label": string;
      "n": number;
      "quality": number;
    }>;
  "stimulants": {
    "caffeine": {
      "gap": number;
      "n": number;
      "quality_with": number;
      "quality_without": number;
      "yearly_pct": Record<string, number>;
    };
    "wine": {
      "combo": {
        "neither": {
          "n": number;
          "quality": number;
        };
        "wine_and_late": {
          "n": number;
          "quality": number;
        };
        "wine_only": {
          "n": number;
          "quality": number;
        };
      };
      "gap": number;
      "n": number;
      "quality_with": number;
      "quality_without": number;
      "yearly_pct": Record<string, number>;
    };
  };
};

type Data9Base = {
  "body": Record<string, {
      "delta": number;
      "with": number;
      "without": number;
    }>;
  "continuity": {
    "awake_h": {
      "delta": number;
      "with": number;
      "without": number;
    };
    "awake_share_pct": {
      "delta": number;
      "with": number;
      "without": number;
    };
    "efficiency_pct": {
      "delta": number;
      "with": number;
      "without": number;
    };
  };
  "exemplars": {
    "best_quality": Array<{
        "asleep_h": number;
        "awake_h": number;
        "bd": null;
        "bedtime": number;
        "date": string;
        "deep_pct": number;
        "in_bed_h": number;
        "mood": string;
        "quality": number;
        "regularity": number;
        "snore_min": number;
        "tags": Array<string>;
      }>;
    "highest_awake": Array<{
        "asleep_h": number;
        "awake_h": number;
        "bd": number | null;
        "bedtime": number;
        "date": string;
        "deep_pct": number;
        "in_bed_h": number;
        "mood": string;
        "quality": number;
        "regularity": number;
        "snore_min": number;
        "tags": Array<string>;
      }>;
    "worst_quality": Array<{
        "asleep_h": number;
        "awake_h": number;
        "bd": number | null;
        "bedtime": number;
        "date": string;
        "deep_pct": number;
        "in_bed_h": number;
        "mood": string;
        "quality": number;
        "regularity": number;
        "snore_min": number;
        "tags": Array<string>;
      }>;
  };
  "headline": Record<string, {
      "delta": number;
      "with": number;
      "without": number;
    }>;
  "meta": {
    "break_definition": string;
    "kind": string;
    "late_bedtime_threshold": string;
    "short_asleep_threshold_h": number;
    "short_in_bed_threshold_h": number;
    "source_mode": string;
    "version": number;
  };
  "overall": {
    "break_n": number;
    "break_pct": number;
    "nights": number;
  };
  "overlap": Record<string, {
      "baseline_pct": number;
      "delta": number;
      "with_break_pct": number;
    }>;
  "stratified": {
    "bedtime": {
      "gt_1am": {
        "not_selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
        "selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
      };
      "lte_1am": {
        "not_selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
        "selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
      };
    };
    "in_bed": {
      "gte_7h": {
        "not_selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
        "selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
      };
      "lt_7h": {
        "not_selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
        "selected": {
          "all": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "non_break": {
            "bad_pct": number;
            "bd": number;
            "break_n": number;
            "break_pct": number;
            "n": number;
            "quality": number;
            "snore": number;
          };
          "quality_delta": number;
        };
      };
    };
  };
  "tag_stratified": {
    "holiday_night": {
      "with_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
      "without_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
    };
    "tea_coffee": {
      "with_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
      "without_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
    };
    "tired": {
      "with_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
      "without_tag": {
        "awake_h_delta": number;
        "bad_pct_delta": number;
        "break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "break_n": number;
        "break_pct": number;
        "efficiency_pct_delta": number;
        "n": number;
        "non_break": {
          "awake_h": number;
          "awake_share_pct": number;
          "bad_pct": number;
          "efficiency_pct": number;
          "quality": number;
        };
        "quality_delta": number;
      };
    };
  };
  "yearly": Record<string, {
      "break_n": number;
      "break_pct": number;
      "n": number;
      "quality": number | null;
    }>;
};

export type DATA10 = {
  "rain_impact": Array<{
      "bad_pct": number;
      "bd": number;
      "label": string;
      "snore": number;
    }>;
  "temp_impact": Array<{
      "bd": number;
      "label": string;
      "snore": number;
    }>;
};

export type DATA11 = {
  "locations": Array<{
      "asleep_h": number;
      "bad_pct": number;
      "bd": number;
      "date_range": string;
      "n": number;
      "noise_tag_pct": number;
      "phase": string;
      "phase_short": string;
      "plug_pct": number;
      "quality": number;
      "snore": number;
    }>;
  "noise_impact": Array<{
      "label": string;
      "n": number;
      "plug_pct": number;
    }>;
};

export type DATA12 = {
  "exertion_buckets": Array<{
      "bd": number;
      "label": string;
      "n": number;
      "quality": number;
    }>;
  "high_steps_breakdown": {
    "hiking": {
      "bd": number;
      "n": number;
      "quality": number;
    };
    "other": {
      "bd": number;
      "n": number;
      "quality": number;
    };
    "travel": {
      "bd": number;
      "n": number;
      "quality": number;
    };
  };
  "swimming_proxy": {
    "bd": number;
    "n": number;
    "quality": number;
  };
};

export type DATA13 = {
  "circadian_shift": Array<{
      "avg_latency": number;
      "avg_quality": number;
      "avg_tib": number;
      "count": number;
      "label": string;
    }>;
  "debt_3day": Array<{
      "avg_asleep": number;
      "avg_bedtime": number;
      "avg_quality": number;
      "avg_tib": number;
      "count": number;
      "label": string;
    }>;
  "rebound_stats": Array<{
      "bedtime_shift_mins": number;
      "count": number;
      "label": string;
      "latency_mins": number;
      "next_quality": number;
      "next_tib": number;
    }>;
  "streak_stats": Array<{
      "count": number;
      "label": string;
      "next_quality": number;
      "next_tib": number;
    }>;
};

export type DATA14 = {
  "bedtime_cost": Record<string, {
      "diff": number;
      "label": string;
      "n": number;
      "q": number;
    }>;
  "monthly_regularity": Record<string, {
      "q": number;
      "reg": number;
    }>;
  "mood_quality": {
    "buckets": Array<string>;
    "matrix": {
      "70-79": {
        "Bad": number;
        "Good": number;
        "OK": number;
        "n": number;
      };
      "80-89": {
        "Bad": number;
        "Good": number;
        "OK": number;
        "n": number;
      };
      "90+": {
        "Bad": number;
        "Good": number;
        "OK": number;
        "n": number;
      };
      "<70": {
        "Bad": number;
        "Good": number;
        "OK": number;
        "n": number;
      };
    };
  };
};

export type DATA15 = {
  "confounding": Array<{
      "model_delta": number;
      "naive_delta": number;
      "tag": string;
    }>;
  "counterfactuals": {
    "mood": Array<{
        "delta": number;
        "scenario": string;
      }>;
    "quality": Array<{
        "delta": number;
        "scenario": string;
      }>;
  };
  "meta": {
    "mood_model": {
      "accuracy": number;
      "auc": number;
    };
    "quality_model": {
      "mae": number;
      "nights": number;
      "r2": number;
    };
  };
  "quality_mood_gap": {
    "after_midnight_pct": number;
    "mean_bedtime_offset_h": number;
    "share_pct": number;
    "tired_pct": number;
  };
  "top_features": {
    "mood": Array<{
        "feature": string;
        "relative": number;
        "value": number;
      }>;
    "quality": Array<{
        "feature": string;
        "relative": number;
        "value": number;
      }>;
  };
};

export type DATA_TRAVEL = {
  "damage_factors": Array<{
      "baseline_pct": number;
      "lift": number;
      "quality_with": number;
      "quality_without": number;
      "tag": string;
      "travel_pct": number;
    }>;
  "length_effect": Array<{
      "label": string;
      "n": number;
      "quality": number | null;
    }>;
  "meta": {
    "kind": string;
    "version": number;
  };
  "overview": {
    "baseline_quality_mean": number;
    "long_trip_count": number;
    "quality_gap": number;
    "short_trip_count": number;
    "total_n": number;
    "travel_n": number;
    "travel_pct": number;
    "travel_quality_mean": number;
    "trip_count": number;
  };
  "pre_travel": {
    "baseline_fly_pct": number;
    "baseline_quality_mean": number;
    "fly_pct": number;
    "n": number;
    "quality_mean": number;
  };
  "recovery_by_length": {
    "long": Array<{
        "label": string;
        "n": number;
        "offset": number;
        "quality": number;
      }>;
    "short": Array<{
        "label": string;
        "n": number;
        "offset": number;
        "quality": number;
      }>;
  };
  "recovery_curve": Array<{
      "label": string;
      "n": number;
      "offset": number;
      "quality": number;
    }>;
};


export type DATA6 = Omit<Data6Base, "yearly"> & {yearly: Record<string, Data6Base["yearly"][string] & {quality?: number}>};
export type DATA9 = Omit<Data9Base, "yearly"> & {yearly: Record<string, Data9Base["yearly"][string] & {quality_delta?: number}>};
