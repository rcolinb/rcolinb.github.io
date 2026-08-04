# N326 preliminary assessment analysis
#
# Runs with base R only against the deidentified CSV extracts in ./data.
# If a workbook path is supplied and readxl is installed, the script can read
# the current workbook directly instead:
#   Rscript n326_preliminary_analysis.R /path/to/N326_Assessment_Analytics.xlsx
#
# All exported results are aggregate or item-level; direct student identifiers
# are never written.

options(stringsAsFactors = FALSE, scipen = 999)

command_args <- commandArgs(trailingOnly = FALSE)
file_arg <- sub("^--file=", "", command_args[grepl("^--file=", command_args)])
script_dir <- if (length(file_arg)) dirname(normalizePath(file_arg[1])) else getwd()
trailing_args <- commandArgs(trailingOnly = TRUE)
workbook_arg <- if (length(trailing_args) && grepl("\\.xlsx$", trailing_args[1], ignore.case = TRUE)) trailing_args[1] else NA_character_

data_dir <- file.path(script_dir, "data")
result_dir <- file.path(script_dir, "results")
dir.create(result_dir, recursive = TRUE, showWarnings = FALSE)

read_source <- function(sheet_name, csv_name) {
  if (!is.na(workbook_arg)) {
    if (!file.exists(workbook_arg)) stop("Workbook not found: ", workbook_arg)
    if (!requireNamespace("readxl", quietly = TRUE)) {
      stop("Reading XLSX directly requires readxl. Run without the workbook argument to use the included CSV extracts.")
    }
    return(as.data.frame(readxl::read_excel(workbook_arg, sheet = sheet_name, .name_repair = "minimal"), check.names = FALSE))
  }
  csv_path <- file.path(data_dir, csv_name)
  if (!file.exists(csv_path)) stop("Analysis input not found: ", csv_path)
  read.csv(csv_path, check.names = FALSE, na.strings = c("", "NA"), stringsAsFactors = FALSE)
}

assessments <- read_source("Assessments", "assessments.csv")
attempts <- read_source("Student Attempts", "student_attempts_deidentified.csv")
items <- read_source("Items", "items.csv")
item_results <- read_source("Item Results", "item_results_deidentified.csv")
competency_scores <- read_source("Competency Scores", "competency_scores_deidentified.csv")

# Drop direct identifiers immediately if the workbook was read directly.
attempts <- attempts[, setdiff(names(attempts), c("Student ID", "Last Name", "First Name", "Email", "Source CSV")), drop = FALSE]
item_results <- item_results[, setdiff(names(item_results), "Source CSV"), drop = FALSE]
competency_scores <- competency_scores[, setdiff(names(competency_scores), "Source CSV"), drop = FALSE]

numeric_attempt_cols <- c("Number", "Points Earned", "Max Points", "Exported %", "Recalculated %", "Raw Score", "Rank", "Percentile")
numeric_item_cols <- c("Assessment Number", "Item Number", "Max Points", "PDF Difficulty", "Point-Biserial", "Student N", "Observed Facility", "Observed-PDF Delta")
numeric_result_cols <- c("Item Number", "Points Earned", "Max Points")
for (nm in intersect(numeric_attempt_cols, names(attempts))) attempts[[nm]] <- suppressWarnings(as.numeric(attempts[[nm]]))
for (nm in intersect(numeric_item_cols, names(items))) items[[nm]] <- suppressWarnings(as.numeric(items[[nm]]))
for (nm in intersect(numeric_result_cols, names(item_results))) item_results[[nm]] <- suppressWarnings(as.numeric(item_results[[nm]]))

benchmark <- 0.75
difficult_threshold <- 0.60
very_easy_threshold <- 0.90
low_discrimination_threshold <- 0.20
very_low_discrimination_threshold <- 0.10

safe_mean <- function(x) if (all(is.na(x))) NA_real_ else mean(x, na.rm = TRUE)
safe_sd <- function(x) if (sum(!is.na(x)) < 2) NA_real_ else sd(x, na.rm = TRUE)
safe_median <- function(x) if (all(is.na(x))) NA_real_ else median(x, na.rm = TRUE)
safe_cor <- function(x, y, method = "pearson") {
  keep <- complete.cases(x, y)
  if (sum(keep) < 4 || sd(x[keep]) == 0 || sd(y[keep]) == 0) return(NA_real_)
  cor(x[keep], y[keep], method = method)
}

normalize_stem <- function(x) {
  x <- iconv(ifelse(is.na(x), "", x), to = "ASCII//TRANSLIT")
  x <- tolower(x)
  x <- gsub("[^a-z0-9]+", " ", x)
  trimws(gsub("[[:space:]]+", " ", x))
}

classify_content <- function(stem, options, mental_health_topic) {
  topic <- ifelse(is.na(mental_health_topic), "", mental_health_topic)
  text <- tolower(paste(ifelse(is.na(stem), "", stem), ifelse(is.na(options), "", options)))
  if (topic == "Bipolar Disorder") return("Bipolar/mania")
  if (topic == "Depressive Disorders") return("Depression")
  if (grepl("bipolar|manic|mania|lithium|lamotrigine|carbamazepine|valpro", text)) return("Bipolar/mania")
  if (grepl("suicid|self-harm|hanging|lethal means|kill myself|kill themself|kill herself|kill himself|suicide attempt", text)) return("Suicide/safety")
  if (grepl("depress|mdd|sertraline|fluoxetine|ssri|electroconvulsive|\\bect\\b|tricyclic|anhedonia|grief|hopeless|dysthym|persistent depressive", text)) return("Depression")
  if (topic == "Alterations Of Mood, Affect, And Suicidal Ideation") return("Mood/affect—other")
  "Other"
}

classify_focus <- function(stem, options, content_group) {
  text <- tolower(paste(ifelse(is.na(stem), "", stem), ifelse(is.na(options), "", options)))
  if (grepl("electroconvulsive|\\bect\\b", text)) return("ECT: indications, teaching, or evaluation")
  if (grepl("lamotrigine|carbamazepine|rash", text) && content_group == "Bipolar/mania") return("Mood stabilizer rash safety")
  if (grepl("lithium", text)) return("Lithium safety and teaching")
  if (grepl("tricyclic", text)) return("Tricyclic antidepressant safety")
  if (grepl("serotonin syndrome|sumatriptan|sertraline|fluoxetine|ssri", text)) return("Antidepressant medication safety")
  if (content_group == "Suicide/safety") return("Suicide screening, risk, and safety")
  if (content_group == "Bipolar/mania") return("Mania recognition and nursing care")
  if (grepl("grief|bereave", text)) return("Grief versus depression")
  if (content_group == "Depression") return("Depression assessment and nursing care")
  if (content_group == "Adjacent/PTSD") return("Adjacent trauma/PTSD content")
  "Other"
}

items$`Normalized Stem` <- vapply(items$`Stem / Scenario`, normalize_stem, character(1))
items$`Content Group` <- mapply(classify_content, items$`Stem / Scenario`, items$`Options / Response Set`, items$`Mental Health Topic`, USE.NAMES = FALSE)

# These two case-sequence items contain suicide language in the shared profile,
# but the scored prompt assesses trauma-informed PTSD care rather than Quiz 3 content.
adjacent_overrides <- c("2026-01-E2-Q04", "2026-03-E2-Q04")
items$`Content Group`[items$`Item Key` %in% adjacent_overrides] <- "Adjacent/PTSD"
items$`Content Group`[items$`Item Key` == "2026-03-Q3-Q05"] <- "Suicide/safety"
items$`Instructional Focus` <- mapply(classify_focus, items$`Stem / Scenario`, items$`Options / Response Set`, items$`Content Group`, USE.NAMES = FALSE)
items$`Effective Question Type` <- items$`Question Type`
blank_format <- is.na(items$`Effective Question Type`) | trimws(items$`Effective Question Type`) == ""
multiple_response <- grepl("select all|select [a-z]* that apply", tolower(ifelse(is.na(items$`Stem / Scenario`), "", items$`Stem / Scenario`))) |
  grepl(",", ifelse(is.na(items$`Correct Answer`), "", items$`Correct Answer`))
items$`Effective Question Type`[blank_format & multiple_response] <- "Inferred multiple response"
items$`Effective Question Type`[blank_format & !multiple_response] <- "Inferred multiple choice"

# -----------------------------------------------------------------------------
# Assessment and session summaries
# -----------------------------------------------------------------------------

attempt_groups <- split(seq_len(nrow(attempts)), attempts$`Assessment Key`)
assessment_summary <- do.call(rbind, lapply(attempt_groups, function(index) {
  x <- attempts[index, ]
  scores <- x$`Exported %`
  data.frame(
    `Assessment Key` = x$`Assessment Key`[1],
    `Student N` = sum(!is.na(scores)),
    `Mean Score` = safe_mean(scores),
    `SD Score` = safe_sd(scores),
    `Median Score` = safe_median(scores),
    `Minimum Score` = if (all(is.na(scores))) NA_real_ else min(scores, na.rm = TRUE),
    `Maximum Score` = if (all(is.na(scores))) NA_real_ else max(scores, na.rm = TRUE),
    `At or Above 75%` = sum(scores >= benchmark, na.rm = TRUE),
    `Benchmark Rate` = safe_mean(scores >= benchmark),
    check.names = FALSE
  )
}))

assessment_meta <- assessments[, c("Assessment Key", "Session", "Session Sort", "Type", "Number", "Questions", "Avg Point-Biserial", "Discrimination Index", "PDF Difficulty"), drop = FALSE]
assessment_summary <- merge(assessment_meta, assessment_summary, by = "Assessment Key", all.x = TRUE, sort = FALSE)
assessment_summary <- assessment_summary[order(assessment_summary$`Session Sort`, assessment_summary$Type, assessment_summary$Number), ]
write.csv(assessment_summary, file.path(result_dir, "assessment_summary.csv"), row.names = FALSE, na = "")

session_groups <- split(seq_len(nrow(attempts)), attempts$Session)
session_summary <- do.call(rbind, lapply(session_groups, function(index) {
  x <- attempts[index, ]
  quiz_scores <- x$`Exported %`[x$Type == "Quiz"]
  exam_scores <- x$`Exported %`[x$Type == "Exam"]
  data.frame(
    Session = x$Session[1],
    Students = length(unique(x$`Student Key`)),
    Assessments = length(unique(x$`Assessment Key`)),
    Attempts = nrow(x),
    `Mean Quiz` = safe_mean(quiz_scores),
    `Mean Exam` = safe_mean(exam_scores),
    `Quiz SD` = safe_sd(quiz_scores),
    `Exam SD` = safe_sd(exam_scores),
    `Quiz Benchmark Rate` = safe_mean(quiz_scores >= benchmark),
    `Exam Benchmark Rate` = safe_mean(exam_scores >= benchmark),
    check.names = FALSE
  )
}))
session_order <- unique(attempts$Session[order(attempts$`Session Sort`)])
session_summary <- session_summary[match(session_order, session_summary$Session), ]
write.csv(session_summary, file.path(result_dir, "session_summary.csv"), row.names = FALSE, na = "")

# Paired progression avoids comparing different students within a session.
paired_change <- function(type, first_number, last_number, label) {
  a <- attempts[attempts$Type == type & attempts$Number == first_number, c("Student Key", "Session", "Exported %")]
  b <- attempts[attempts$Type == type & attempts$Number == last_number, c("Student Key", "Session", "Exported %")]
  names(a)[3] <- "First"
  names(b)[3] <- "Last"
  paired <- merge(a, b, by = c("Student Key", "Session"))
  if (!nrow(paired)) return(data.frame())
  out <- do.call(rbind, lapply(split(seq_len(nrow(paired)), paired$Session), function(index) {
    x <- paired[index, ]
    delta <- x$Last - x$First
    data.frame(
      Comparison = label,
      Session = x$Session[1],
      `Paired N` = nrow(x),
      `First Mean` = safe_mean(x$First),
      `Last Mean` = safe_mean(x$Last),
      `Mean Change` = safe_mean(delta),
      `Median Change` = safe_median(delta),
      `Improved N` = sum(delta > 0, na.rm = TRUE),
      `Declined N` = sum(delta < 0, na.rm = TRUE),
      check.names = FALSE
    )
  }))
  out
}

progression <- rbind(
  paired_change("Quiz", 1, 5, "Quiz 1 to Quiz 5"),
  paired_change("Exam", 1, 2, "Exam 1 to Exam 2")
)
write.csv(progression, file.path(result_dir, "paired_progression.csv"), row.names = FALSE, na = "")

# -----------------------------------------------------------------------------
# Local item statistics and exploratory reliability
# -----------------------------------------------------------------------------

assessment_totals <- tapply(item_results$`Points Earned`, item_results$`Attempt Key`, sum, na.rm = TRUE)
item_stats <- vector("list", nrow(items))
for (i in seq_len(nrow(items))) {
  row <- items[i, ]
  rr <- item_results[item_results$`Assessment Key` == row$`Assessment Key` & item_results$`Item Number` == row$`Item Number`, ]
  earned <- rr$`Points Earned`
  possible <- rr$`Max Points`
  rest_score <- unname(assessment_totals[rr$`Attempt Key`]) - earned
  local_rpb <- safe_cor(earned, rest_score)
  response_table <- sort(table(ifelse(is.na(rr$Response), "(blank)", rr$Response)), decreasing = TRUE)
  item_stats[[i]] <- data.frame(
    `Item Key` = row$`Item Key`,
    `Assessment Key` = row$`Assessment Key`,
    Session = row$Session,
    Type = row$Type,
    `Assessment Number` = row$`Assessment Number`,
    `Item Number` = row$`Item Number`,
    `Content Group` = row$`Content Group`,
    `Instructional Focus` = row$`Instructional Focus`,
    `Mental Health Topic` = row$`Mental Health Topic`,
    `Question Type` = row$`Question Type`,
    `Effective Question Type` = row$`Effective Question Type`,
    `Student N` = length(unique(rr$`Attempt Key`)),
    `Local Facility` = if (sum(possible, na.rm = TRUE) == 0) NA_real_ else sum(earned, na.rm = TRUE) / sum(possible, na.rm = TRUE),
    `Local Corrected Item-Rest Correlation` = local_rpb,
    `Vendor/PDF Difficulty` = row$`PDF Difficulty`,
    `Vendor/PDF Point-Biserial` = row$`Point-Biserial`,
    `Facility Difference vs PDF` = ifelse(is.na(row$`PDF Difficulty`), NA_real_, if (sum(possible, na.rm = TRUE) == 0) NA_real_ else sum(earned, na.rm = TRUE) / sum(possible, na.rm = TRUE) - row$`PDF Difficulty`),
    `Unique Response Patterns` = length(response_table),
    `Modal Response Share` = if (!length(response_table)) NA_real_ else as.numeric(response_table[1]) / sum(response_table),
    `Stem / Scenario` = row$`Stem / Scenario`,
    `Options / Response Set` = row$`Options / Response Set`,
    `Correct Answer` = row$`Correct Answer`,
    `Normalized Stem` = row$`Normalized Stem`,
    check.names = FALSE
  )
}
item_stats <- do.call(rbind, item_stats)

item_stats$`Difficulty Flag` <- ifelse(
  is.na(item_stats$`Local Facility`), "No local data",
  ifelse(item_stats$`Local Facility` < difficult_threshold, "Difficult",
         ifelse(item_stats$`Local Facility` >= very_easy_threshold, "Very easy", "Moderate"))
)
item_stats$`Discrimination Flag` <- ifelse(
  is.na(item_stats$`Local Corrected Item-Rest Correlation`), "No variance / unstable",
  ifelse(item_stats$`Local Corrected Item-Rest Correlation` < 0, "Negative",
         ifelse(item_stats$`Local Corrected Item-Rest Correlation` < very_low_discrimination_threshold, "Very low",
                ifelse(item_stats$`Local Corrected Item-Rest Correlation` < low_discrimination_threshold, "Low", "Acceptable")))
)

cronbach_alpha <- function(assessment_key) {
  rr <- item_results[item_results$`Assessment Key` == assessment_key, ]
  student_ids <- unique(rr$`Attempt Key`)
  item_ids <- sort(unique(rr$`Item Number`))
  score_matrix <- matrix(NA_real_, nrow = length(student_ids), ncol = length(item_ids), dimnames = list(student_ids, item_ids))
  for (j in seq_len(nrow(rr))) {
    score_matrix[match(rr$`Attempt Key`[j], student_ids), match(rr$`Item Number`[j], item_ids)] <- rr$`Points Earned`[j]
  }
  complete <- complete.cases(score_matrix)
  score_matrix <- score_matrix[complete, , drop = FALSE]
  k <- ncol(score_matrix)
  total_sd <- if (nrow(score_matrix) < 2) NA_real_ else sd(rowSums(score_matrix))
  if (nrow(score_matrix) < 4 || k < 2 || is.na(total_sd) || total_sd == 0) {
    return(c(raw_alpha = NA_real_, standardized_alpha = NA_real_, n = nrow(score_matrix), k = k, nonzero_k = 0, total_sd = total_sd))
  }
  raw_alpha <- k / (k - 1) * (1 - sum(apply(score_matrix, 2, var)) / var(rowSums(score_matrix)))
  nonzero <- apply(score_matrix, 2, sd) > 0
  nonzero_k <- sum(nonzero)
  standardized_alpha <- NA_real_
  if (nonzero_k >= 2) {
    correlation_matrix <- cor(score_matrix[, nonzero, drop = FALSE])
    mean_correlation <- mean(correlation_matrix[lower.tri(correlation_matrix)], na.rm = TRUE)
    standardized_alpha <- nonzero_k * mean_correlation / (1 + (nonzero_k - 1) * mean_correlation)
  }
  c(raw_alpha = raw_alpha, standardized_alpha = standardized_alpha, n = nrow(score_matrix), k = k, nonzero_k = nonzero_k, total_sd = total_sd)
}

reliability_rows <- lapply(unique(attempts$`Assessment Key`), function(key) {
  values <- cronbach_alpha(key)
  meta <- assessments[assessments$`Assessment Key` == key, ]
  data.frame(
    `Assessment Key` = key,
    Session = meta$Session[1],
    Type = meta$Type[1],
    Number = meta$Number[1],
    `Complete N` = unname(values["n"]),
    Items = unname(values["k"]),
    `Items with Nonzero Variance` = unname(values["nonzero_k"]),
    `Total Score SD (points)` = unname(values["total_sd"]),
    `Exploratory Raw Cronbach Alpha` = unname(values["raw_alpha"]),
    `Exploratory Standardized Alpha` = unname(values["standardized_alpha"]),
    check.names = FALSE
  )
})
reliability <- do.call(rbind, reliability_rows)
reliability <- reliability[order(match(reliability$Session, session_order), reliability$Type, reliability$Number), ]
write.csv(reliability, file.path(result_dir, "assessment_reliability.csv"), row.names = FALSE, na = "")

# -----------------------------------------------------------------------------
# Quiz 3 -> Exam 2 relationship
# -----------------------------------------------------------------------------

quiz3_attempts <- attempts[attempts$Type == "Quiz" & attempts$Number == 3, c("Student Key", "Session", "Assessment Key", "Exported %")]
exam2_attempts <- attempts[attempts$Type == "Exam" & attempts$Number == 2, c("Student Key", "Session", "Assessment Key", "Exported %")]
names(quiz3_attempts)[3:4] <- c("Quiz 3 Assessment", "Quiz 3 Score")
names(exam2_attempts)[3:4] <- c("Exam 2 Assessment", "Exam 2 Score")
q3_e2 <- merge(quiz3_attempts, exam2_attempts, by = c("Student Key", "Session"))

link_rows <- list()
for (label in c("All paired sessions", unique(q3_e2$Session))) {
  x <- if (label == "All paired sessions") q3_e2 else q3_e2[q3_e2$Session == label, ]
  pearson <- safe_cor(x$`Quiz 3 Score`, x$`Exam 2 Score`, "pearson")
  spearman <- safe_cor(x$`Quiz 3 Score`, x$`Exam 2 Score`, "spearman")
  link_rows[[length(link_rows) + 1]] <- data.frame(
    Session = label,
    `Paired N` = nrow(x),
    `Quiz 3 Mean` = safe_mean(x$`Quiz 3 Score`),
    `Exam 2 Mean` = safe_mean(x$`Exam 2 Score`),
    `Pearson r` = pearson,
    `Spearman rho` = spearman,
    `Both at/above 75%` = sum(x$`Quiz 3 Score` >= benchmark & x$`Exam 2 Score` >= benchmark, na.rm = TRUE),
    `Quiz 3 pass / Exam 2 below` = sum(x$`Quiz 3 Score` >= benchmark & x$`Exam 2 Score` < benchmark, na.rm = TRUE),
    `Quiz 3 below / Exam 2 pass` = sum(x$`Quiz 3 Score` < benchmark & x$`Exam 2 Score` >= benchmark, na.rm = TRUE),
    `Both below 75%` = sum(x$`Quiz 3 Score` < benchmark & x$`Exam 2 Score` < benchmark, na.rm = TRUE),
    check.names = FALSE
  )
}
q3_e2_link <- do.call(rbind, link_rows)
write.csv(q3_e2_link, file.path(result_dir, "quiz3_exam2_link.csv"), row.names = FALSE, na = "")

model_summary <- data.frame()
if (nrow(q3_e2) >= 8 && length(unique(q3_e2$Session)) >= 2) {
  q3_e2$SessionFactor <- factor(q3_e2$Session)
  model <- lm(`Exam 2 Score` ~ `Quiz 3 Score` + SessionFactor, data = q3_e2)
  coefficient <- coef(summary(model))["`Quiz 3 Score`", ]
  model_summary <- data.frame(
    Model = "Exam 2 score ~ Quiz 3 score + session",
    N = nobs(model),
    `Quiz 3 Slope` = unname(coefficient["Estimate"]),
    `Slope SE` = unname(coefficient["Std. Error"]),
    `Slope p-value` = unname(coefficient["Pr(>|t|)"]),
    `Adjusted R-squared` = summary(model)$adj.r.squared,
    check.names = FALSE
  )
}
write.csv(model_summary, file.path(result_dir, "quiz3_exam2_model.csv"), row.names = FALSE, na = "")

screening_cutoffs <- do.call(rbind, lapply(c(0.75, 0.80, 0.85, 0.90, 0.95), function(cutoff) {
  predicted_risk <- q3_e2$`Quiz 3 Score` < cutoff
  exam2_below <- q3_e2$`Exam 2 Score` < benchmark
  true_positive <- sum(predicted_risk & exam2_below, na.rm = TRUE)
  false_positive <- sum(predicted_risk & !exam2_below, na.rm = TRUE)
  true_negative <- sum(!predicted_risk & !exam2_below, na.rm = TRUE)
  false_negative <- sum(!predicted_risk & exam2_below, na.rm = TRUE)
  data.frame(
    `Quiz 3 At-Risk Cutoff` = cutoff,
    N = nrow(q3_e2),
    `Exam 2 Below 75% N` = sum(exam2_below, na.rm = TRUE),
    `Flagged by Quiz 3 N` = sum(predicted_risk, na.rm = TRUE),
    Sensitivity = if ((true_positive + false_negative) == 0) NA_real_ else true_positive / (true_positive + false_negative),
    Specificity = if ((true_negative + false_positive) == 0) NA_real_ else true_negative / (true_negative + false_positive),
    `Positive Predictive Value` = if ((true_positive + false_positive) == 0) NA_real_ else true_positive / (true_positive + false_positive),
    `Negative Predictive Value` = if ((true_negative + false_negative) == 0) NA_real_ else true_negative / (true_negative + false_negative),
    check.names = FALSE
  )
}))
write.csv(screening_cutoffs, file.path(result_dir, "quiz3_exam2_screening_cutoffs.csv"), row.names = FALSE, na = "")

prior_rows <- list()
for (prior_type in c("Quiz", "Exam")) {
  prior_numbers <- sort(unique(attempts$Number[attempts$Type == prior_type]))
  for (prior_number in prior_numbers) {
    if (prior_type == "Exam" && prior_number == 2) next
    prior <- attempts[attempts$Type == prior_type & attempts$Number == prior_number, c("Student Key", "Session", "Exported %")]
    names(prior)[3] <- "Prior Score"
    linked <- merge(prior, exam2_attempts[, c("Student Key", "Session", "Exam 2 Score")], by = c("Student Key", "Session"))
    if (nrow(linked) < 8) next
    linked$SessionFactor <- factor(linked$Session)
    prior_model <- lm(`Exam 2 Score` ~ `Prior Score` + SessionFactor, data = linked)
    coefficient <- coef(summary(prior_model))["`Prior Score`", ]
    prior_rows[[length(prior_rows) + 1]] <- data.frame(
      `Prior Assessment` = paste(prior_type, prior_number),
      N = nrow(linked),
      `Pearson r` = safe_cor(linked$`Prior Score`, linked$`Exam 2 Score`, "pearson"),
      `Spearman rho` = safe_cor(linked$`Prior Score`, linked$`Exam 2 Score`, "spearman"),
      `Session-Adjusted Slope` = unname(coefficient["Estimate"]),
      `Slope p-value` = unname(coefficient["Pr(>|t|)"]),
      `Adjusted R-squared` = summary(prior_model)$adj.r.squared,
      check.names = FALSE
    )
  }
}
prior_prediction <- do.call(rbind, prior_rows)
prior_prediction$`BH-Adjusted p-value` <- p.adjust(prior_prediction$`Slope p-value`, method = "BH")
write.csv(prior_prediction, file.path(result_dir, "prior_assessment_exam2_relationships.csv"), row.names = FALSE, na = "")

# -----------------------------------------------------------------------------
# Quiz 3 / Exam 2 content alignment and item review
# -----------------------------------------------------------------------------

q3_item_stats <- item_stats[item_stats$Type == "Quiz" & item_stats$`Assessment Number` == 3, ]
exam2_topic_tags <- c("Bipolar Disorder", "Depressive Disorders", "Alterations Of Mood, Affect, And Suicidal Ideation")
exam2_relevant <- item_stats[item_stats$Type == "Exam" & item_stats$`Assessment Number` == 2 & item_stats$`Mental Health Topic` %in% exam2_topic_tags, ]

topic_summary_one <- function(x, stage) {
  if (!nrow(x)) return(data.frame())
  groups <- split(seq_len(nrow(x)), paste(x$Session, x$`Content Group`, sep = "|||"))
  do.call(rbind, lapply(groups, function(index) {
    y <- x[index, ]
    data.frame(
      Stage = stage,
      Session = y$Session[1],
      `Content Group` = y$`Content Group`[1],
      Items = nrow(y),
      `Mean Local Facility` = safe_mean(y$`Local Facility`),
      `Median Local Facility` = safe_median(y$`Local Facility`),
      `Mean Vendor/PDF Point-Biserial` = safe_mean(y$`Vendor/PDF Point-Biserial`),
      `Mean Local Corrected Item-Rest Correlation` = safe_mean(y$`Local Corrected Item-Rest Correlation`),
      `Very Easy Items` = sum(y$`Local Facility` >= very_easy_threshold, na.rm = TRUE),
      `Difficult Items` = sum(y$`Local Facility` < difficult_threshold, na.rm = TRUE),
      check.names = FALSE
    )
  }))
}

topic_performance <- rbind(topic_summary_one(q3_item_stats, "Quiz 3"), topic_summary_one(exam2_relevant, "Exam 2 relevant content"))
topic_performance <- topic_performance[order(match(topic_performance$Session, session_order), topic_performance$Stage, topic_performance$`Content Group`), ]
write.csv(topic_performance, file.path(result_dir, "quiz3_exam2_topic_performance.csv"), row.names = FALSE, na = "")

coverage_source <- rbind(
  transform(q3_item_stats[, c("Session", "Instructional Focus", "Effective Question Type")], Stage = "Quiz 3"),
  transform(exam2_relevant[, c("Session", "Instructional Focus", "Effective Question Type")], Stage = "Exam 2 relevant content")
)
focus_groups <- split(seq_len(nrow(coverage_source)), paste(coverage_source$Stage, coverage_source$Session, coverage_source$`Instructional Focus`, sep = "|||"))
focus_coverage <- do.call(rbind, lapply(focus_groups, function(index) {
  x <- coverage_source[index, ]
  data.frame(Stage = x$Stage[1], Session = x$Session[1], `Instructional Focus` = x$`Instructional Focus`[1], Items = nrow(x), check.names = FALSE)
}))
focus_coverage <- focus_coverage[order(match(focus_coverage$Session, session_order), focus_coverage$Stage, focus_coverage$`Instructional Focus`), ]
write.csv(focus_coverage, file.path(result_dir, "quiz3_exam2_focus_coverage.csv"), row.names = FALSE, na = "")

format_groups <- split(seq_len(nrow(coverage_source)), paste(coverage_source$Stage, coverage_source$`Effective Question Type`, sep = "|||"))
format_coverage <- do.call(rbind, lapply(format_groups, function(index) {
  x <- coverage_source[index, ]
  data.frame(Stage = x$Stage[1], `Question Type` = x$`Effective Question Type`[1], Items = nrow(x), check.names = FALSE)
}))
format_coverage <- format_coverage[order(format_coverage$Stage, -format_coverage$Items), ]
write.csv(format_coverage, file.path(result_dir, "quiz3_exam2_response_format_coverage.csv"), row.names = FALSE, na = "")

repeat_counts <- table(q3_item_stats$`Normalized Stem`)
q3_item_stats$`Exact Reuse Count` <- unname(repeat_counts[q3_item_stats$`Normalized Stem`])
q3_item_stats$`Exact Reuse Count`[is.na(q3_item_stats$`Exact Reuse Count`)] <- 1
q3_item_stats$`Automated Review Note` <- mapply(function(facility, correlation, reuse, stem) {
  notes <- character()
  if (is.na(reuse)) reuse <- 1
  if (is.na(correlation)) notes <- c(notes, "No score variance; cannot discriminate in this cohort")
  else if (correlation < 0) notes <- c(notes, "Negative local item-rest relationship: review key, wording, and distractors")
  else if (correlation < very_low_discrimination_threshold) notes <- c(notes, "Very low local item-rest relationship")
  else if (correlation < low_discrimination_threshold) notes <- c(notes, "Low local item-rest relationship")
  if (!is.na(facility) && facility >= 0.95) notes <- c(notes, "Ceiling item (>=95% local facility)")
  else if (!is.na(facility) && facility >= very_easy_threshold) notes <- c(notes, "Very easy item")
  else if (!is.na(facility) && facility < difficult_threshold) notes <- c(notes, "Difficult item: confirm clarity/key before retaining")
  if (reuse > 1) notes <- c(notes, paste0("Exact stem reused ", reuse, " times"))
  if (grepl("[]", stem)) notes <- c(notes, "Rendering/export artifact in stem")
  if (!length(notes)) "Retain provisionally; continue accumulating local statistics" else paste(notes, collapse = "; ")
}, q3_item_stats$`Local Facility`, q3_item_stats$`Local Corrected Item-Rest Correlation`, q3_item_stats$`Exact Reuse Count`, q3_item_stats$`Stem / Scenario`, USE.NAMES = FALSE)

q3_review_columns <- c(
  "Item Key", "Session", "Item Number", "Content Group", "Student N", "Local Facility",
  "Local Corrected Item-Rest Correlation", "Vendor/PDF Difficulty", "Vendor/PDF Point-Biserial",
  "Facility Difference vs PDF", "Difficulty Flag", "Discrimination Flag", "Exact Reuse Count",
  "Automated Review Note", "Stem / Scenario", "Options / Response Set", "Correct Answer"
)
write.csv(q3_item_stats[, q3_review_columns], file.path(result_dir, "quiz3_item_review.csv"), row.names = FALSE, na = "")

exam2_review_columns <- c(
  "Item Key", "Session", "Item Number", "Content Group", "Student N", "Local Facility",
  "Local Corrected Item-Rest Correlation", "Vendor/PDF Difficulty", "Vendor/PDF Point-Biserial",
  "Difficulty Flag", "Discrimination Flag", "Stem / Scenario", "Options / Response Set", "Correct Answer"
)
write.csv(exam2_relevant[, exam2_review_columns], file.path(result_dir, "exam2_relevant_item_review.csv"), row.names = FALSE, na = "")

stability_columns <- intersect(names(q3_item_stats), names(exam2_relevant))
stability_source <- rbind(
  transform(q3_item_stats[, stability_columns, drop = FALSE], Stage = "Quiz 3"),
  transform(exam2_relevant[, stability_columns, drop = FALSE], Stage = "Exam 2 relevant content")
)
repeat_groups <- split(seq_len(nrow(stability_source)), stability_source$`Normalized Stem`)
stability_rows <- lapply(repeat_groups, function(index) {
  x <- stability_source[index, ]
  if (nrow(x) < 2) return(NULL)
  data.frame(
    Stage = paste(sort(unique(x$Stage)), collapse = "; "),
    `Content Group` = paste(sort(unique(x$`Content Group`)), collapse = "; "),
    `Administrations` = nrow(x),
    Sessions = paste(sort(unique(x$Session)), collapse = "; "),
    `Facility Minimum` = min(x$`Local Facility`, na.rm = TRUE),
    `Facility Maximum` = max(x$`Local Facility`, na.rm = TRUE),
    `Facility Range` = max(x$`Local Facility`, na.rm = TRUE) - min(x$`Local Facility`, na.rm = TRUE),
    `Mean Local Item-Rest Correlation` = safe_mean(x$`Local Corrected Item-Rest Correlation`),
    `Item Keys` = paste(x$`Item Key`, collapse = "; "),
    `Stem / Scenario` = x$`Stem / Scenario`[1],
    check.names = FALSE
  )
})
stability <- do.call(rbind, Filter(Negate(is.null), stability_rows))
stability <- stability[order(-stability$`Facility Range`, -stability$Administrations), ]
write.csv(stability, file.path(result_dir, "repeated_item_stability.csv"), row.names = FALSE, na = "")

# -----------------------------------------------------------------------------
# July Exam 1 comparison with prior Exam 1 cohorts and forms
# -----------------------------------------------------------------------------

exam1_attempts <- attempts[attempts$Type == "Exam" & attempts$Number == 1, ]
exam1_summary <- assessment_summary[assessment_summary$Type == "Exam" & assessment_summary$Number == 1, ]
exam1_summary$`Local Minus PDF Difficulty` <- exam1_summary$`Mean Score` - exam1_summary$`PDF Difficulty`
write.csv(exam1_summary, file.path(result_dir, "exam1_session_comparison.csv"), row.names = FALSE, na = "")

july_exam1_scores <- exam1_attempts$`Exported %`[exam1_attempts$Session == "Jul 2026"]
comparison_groups <- c("Prior sessions pooled", setdiff(unique(exam1_attempts$Session), "Jul 2026"))
exam1_pairwise_rows <- lapply(comparison_groups, function(group_name) {
  comparison_scores <- if (group_name == "Prior sessions pooled") {
    exam1_attempts$`Exported %`[exam1_attempts$Session != "Jul 2026"]
  } else {
    exam1_attempts$`Exported %`[exam1_attempts$Session == group_name]
  }
  welch <- t.test(july_exam1_scores, comparison_scores)
  wilcoxon <- suppressWarnings(wilcox.test(july_exam1_scores, comparison_scores, exact = FALSE))
  pooled_sd <- sqrt(((length(july_exam1_scores) - 1) * var(july_exam1_scores) + (length(comparison_scores) - 1) * var(comparison_scores)) /
                      (length(july_exam1_scores) + length(comparison_scores) - 2))
  cohen_d <- (mean(july_exam1_scores) - mean(comparison_scores)) / pooled_sd
  correction <- 1 - 3 / (4 * (length(july_exam1_scores) + length(comparison_scores)) - 9)
  data.frame(
    Comparison = paste("Jul 2026 vs", group_name),
    `July N` = length(july_exam1_scores),
    `Comparison N` = length(comparison_scores),
    `July Mean` = mean(july_exam1_scores),
    `Comparison Mean` = mean(comparison_scores),
    `Mean Difference` = mean(july_exam1_scores) - mean(comparison_scores),
    `Welch 95% CI Lower` = welch$conf.int[1],
    `Welch 95% CI Upper` = welch$conf.int[2],
    `Welch p-value` = welch$p.value,
    `Wilcoxon p-value` = wilcoxon$p.value,
    `Hedges g` = cohen_d * correction,
    check.names = FALSE
  )
})
exam1_pairwise <- do.call(rbind, exam1_pairwise_rows)
exam1_pairwise$`BH-Adjusted Welch p-value` <- p.adjust(exam1_pairwise$`Welch p-value`, method = "BH")
write.csv(exam1_pairwise, file.path(result_dir, "exam1_july_pairwise_comparisons.csv"), row.names = FALSE, na = "")

exam1_items <- items[items$Type == "Exam" & items$`Assessment Number` == 1, ]
july_exam1_items <- exam1_items[exam1_items$Session == "Jul 2026", ]
prior_exam1_items <- exam1_items[exam1_items$Session != "Jul 2026", ]
common_item_rows <- lapply(seq_len(nrow(july_exam1_items)), function(i) {
  current <- july_exam1_items[i, ]
  prior <- prior_exam1_items[prior_exam1_items$`Normalized Stem` == current$`Normalized Stem`, ]
  if (!nrow(prior)) return(NULL)
  prior_weights <- prior$`Student N`
  data.frame(
    `July Item Key` = current$`Item Key`,
    `July Item Number` = current$`Item Number`,
    `Mental Health Topic` = current$`Mental Health Topic`,
    `Prior Administrations` = nrow(prior),
    `Prior Item Keys` = paste(prior$`Item Key`, collapse = "; "),
    `Same Response Set Across Prior Administrations` = all(vapply(prior$`Options / Response Set`, normalize_stem, character(1)) == normalize_stem(current$`Options / Response Set`)),
    `Same Key Across Prior Administrations` = all(vapply(prior$`Correct Answer`, normalize_stem, character(1)) == normalize_stem(current$`Correct Answer`)),
    `Max Points` = current$`Max Points`,
    `July Facility` = current$`Observed Facility`,
    `Prior Weighted Facility` = weighted.mean(prior$`Observed Facility`, prior_weights, na.rm = TRUE),
    `Facility Difference` = current$`Observed Facility` - weighted.mean(prior$`Observed Facility`, prior_weights, na.rm = TRUE),
    `Stem / Scenario` = current$`Stem / Scenario`,
    check.names = FALSE
  )
})
exam1_common_items <- do.call(rbind, Filter(Negate(is.null), common_item_rows))
exam1_common_items <- exam1_common_items[order(exam1_common_items$`Facility Difference`), ]
write.csv(exam1_common_items, file.path(result_dir, "exam1_common_item_comparison.csv"), row.names = FALSE, na = "")

july_common <- july_exam1_items$`Normalized Stem` %in% prior_exam1_items$`Normalized Stem`
exam1_common_summary <- data.frame(
  Metric = c(
    "July exact-common items", "July unique items", "Points on exact-common items", "Points on unique items",
    "July weighted facility on common items", "Prior weighted facility for same common items",
    "Common-item facility difference", "July weighted facility on unique items", "Common items declining by at least 15 points",
    "Common stems with unchanged response sets across prior administrations",
    "Common stems with unchanged keys across prior administrations"
  ),
  Value = c(
    sum(july_common), sum(!july_common), sum(july_exam1_items$`Max Points`[july_common]), sum(july_exam1_items$`Max Points`[!july_common]),
    weighted.mean(exam1_common_items$`July Facility`, exam1_common_items$`Max Points`, na.rm = TRUE),
    weighted.mean(exam1_common_items$`Prior Weighted Facility`, exam1_common_items$`Max Points`, na.rm = TRUE),
    weighted.mean(exam1_common_items$`Facility Difference`, exam1_common_items$`Max Points`, na.rm = TRUE),
    weighted.mean(july_exam1_items$`Observed Facility`[!july_common], july_exam1_items$`Max Points`[!july_common], na.rm = TRUE),
    sum(exam1_common_items$`Facility Difference` <= -0.15, na.rm = TRUE),
    sum(exam1_common_items$`Same Response Set Across Prior Administrations`, na.rm = TRUE),
    sum(exam1_common_items$`Same Key Across Prior Administrations`, na.rm = TRUE)
  ),
  check.names = FALSE
)
write.csv(exam1_common_summary, file.path(result_dir, "exam1_common_item_summary.csv"), row.names = FALSE, na = "")

exam1_items$`Topic for Analysis` <- ifelse(is.na(exam1_items$`Mental Health Topic`) | exam1_items$`Mental Health Topic` == "", "(untagged)", exam1_items$`Mental Health Topic`)
topic_rows <- lapply(sort(unique(exam1_items$`Topic for Analysis`)), function(topic_name) {
  current <- exam1_items[exam1_items$Session == "Jul 2026" & exam1_items$`Topic for Analysis` == topic_name, ]
  prior <- exam1_items[exam1_items$Session != "Jul 2026" & exam1_items$`Topic for Analysis` == topic_name, ]
  if (!nrow(current)) return(NULL)
  data.frame(
    Topic = topic_name,
    `July Items` = nrow(current),
    `Prior Item Administrations` = nrow(prior),
    `July Weighted Facility` = weighted.mean(current$`Observed Facility`, current$`Max Points`, na.rm = TRUE),
    `Prior Weighted Facility` = if (nrow(prior)) weighted.mean(prior$`Observed Facility`, prior$`Max Points` * prior$`Student N`, na.rm = TRUE) else NA_real_,
    `Facility Difference` = if (nrow(prior)) weighted.mean(current$`Observed Facility`, current$`Max Points`, na.rm = TRUE) - weighted.mean(prior$`Observed Facility`, prior$`Max Points` * prior$`Student N`, na.rm = TRUE) else NA_real_,
    check.names = FALSE
  )
})
exam1_topic_comparison <- do.call(rbind, Filter(Negate(is.null), topic_rows))
exam1_topic_comparison <- exam1_topic_comparison[order(exam1_topic_comparison$`Facility Difference`), ]
write.csv(exam1_topic_comparison, file.path(result_dir, "exam1_topic_comparison.csv"), row.names = FALSE, na = "")

# -----------------------------------------------------------------------------
# Compact, human-readable replication summary
# -----------------------------------------------------------------------------

q3_assessments <- assessment_summary[assessment_summary$Type == "Quiz" & assessment_summary$Number == 3, ]
q3_reliability <- reliability[reliability$Type == "Quiz" & reliability$Number == 3, ]
vendor_local_corr <- safe_cor(q3_item_stats$`Vendor/PDF Point-Biserial`, q3_item_stats$`Local Corrected Item-Rest Correlation`)

summary_lines <- c(
  "N326 preliminary assessment analysis",
  paste0("Generated: ", format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z")),
  "",
  paste0("Assessments: ", nrow(assessments), "; attempts: ", nrow(attempts), "; items: ", nrow(items), "; item results: ", nrow(item_results)),
  paste0("Quiz 3 administrations: ", nrow(q3_assessments), "; Quiz 3 items: ", nrow(q3_item_stats)),
  paste0("Quiz 3 mean scores by session: ", paste(paste0(q3_assessments$Session, " ", sprintf("%.1f%%", 100 * q3_assessments$`Mean Score`)), collapse = "; ")),
  paste0("Quiz 3 exploratory raw alpha by session: ", paste(paste0(q3_reliability$Session, " ", sprintf("%.2f", q3_reliability$`Exploratory Raw Cronbach Alpha`)), collapse = "; ")),
  paste0("Quiz 3 exploratory standardized alpha by session: ", paste(paste0(q3_reliability$Session, " ", sprintf("%.2f", q3_reliability$`Exploratory Standardized Alpha`)), collapse = "; ")),
  paste0("Quiz 3 items with >=95% facility: ", sum(q3_item_stats$`Local Facility` >= 0.95, na.rm = TRUE), " of ", nrow(q3_item_stats)),
  paste0("Quiz 3 items with negative/very-low local item-rest correlation (<.10): ", sum(q3_item_stats$`Local Corrected Item-Rest Correlation` < 0.10, na.rm = TRUE), " plus ", sum(is.na(q3_item_stats$`Local Corrected Item-Rest Correlation`)), " with no variance"),
  paste0("Correlation between vendor/PDF PB and local corrected item-rest correlation for Quiz 3: ", sprintf("%.2f", vendor_local_corr)),
  "",
  paste0("Paired Quiz 3 -> Exam 2 N: ", q3_e2_link$`Paired N`[1]),
  paste0("Pooled Pearson r: ", sprintf("%.2f", q3_e2_link$`Pearson r`[1]), "; Spearman rho: ", sprintf("%.2f", q3_e2_link$`Spearman rho`[1])),
  if (nrow(model_summary)) paste0("Session-adjusted Quiz 3 slope: ", sprintf("%.2f", model_summary$`Quiz 3 Slope`[1]), "; p=", sprintf("%.3f", model_summary$`Slope p-value`[1]), "; adjusted R-squared=", sprintf("%.2f", model_summary$`Adjusted R-squared`[1])) else "Session-adjusted model unavailable.",
  paste0("Quiz 3 pass but Exam 2 below 75%: ", q3_e2_link$`Quiz 3 pass / Exam 2 below`[1]),
  paste0("At the 75% Quiz 3 cutoff, sensitivity for Exam 2 <75%: ", sprintf("%.0f%%", 100 * screening_cutoffs$Sensitivity[screening_cutoffs$`Quiz 3 At-Risk Cutoff` == 0.75])),
  paste0("Largest pooled prior-assessment correlation with Exam 2: ", prior_prediction$`Prior Assessment`[which.max(prior_prediction$`Pearson r`)], " (r=", sprintf("%.2f", max(prior_prediction$`Pearson r`, na.rm = TRUE)), ")"),
  "",
  paste0("July Exam 1 mean: ", sprintf("%.1f%%", 100 * mean(july_exam1_scores)), "; prior Exam 1 pooled mean: ", sprintf("%.1f%%", 100 * mean(exam1_attempts$`Exported %`[exam1_attempts$Session != "Jul 2026"]))),
  paste0("July minus prior pooled Exam 1: ", sprintf("%.1f percentage points", 100 * exam1_pairwise$`Mean Difference`[1]), "; Welch p=", sprintf("%.3f", exam1_pairwise$`Welch p-value`[1]), "; Hedges g=", sprintf("%.2f", exam1_pairwise$`Hedges g`[1])),
  paste0("Exact common Exam 1 items: ", sum(july_common), " of ", nrow(july_exam1_items), "; common-item facility difference: ", sprintf("%.1f percentage points", 100 * weighted.mean(exam1_common_items$`Facility Difference`, exam1_common_items$`Max Points`, na.rm = TRUE))),
  "",
  "Interpretation cautions:",
  "- Cohorts are small (approximately 10-19 students), so item correlations and alpha estimates are unstable.",
  "- Reused items and ceiling scores reduce independence and make a single pooled estimate look more precise than it is.",
  "- Vendor/PDF psychometrics appear to persist across reused items; local item-rest statistics are calculated separately here.",
  "- These are quality-improvement signals, not proof that an item is valid or invalid."
)
writeLines(summary_lines, file.path(result_dir, "analysis_summary.txt"), useBytes = TRUE)
cat(paste(summary_lines, collapse = "\n"), "\n")
