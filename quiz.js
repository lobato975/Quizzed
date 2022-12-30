class QuizRenderer {
  constructor(quiz) {
    this.quiz = quiz;
  }

  renderQuestion() {
    return {
      type: 'question',
      payload: this.quiz.getCurrentQuestion().question
    };
  }

  renderAnswers() {
    return {
      type: 'answers',
      payload: this.quiz.getCurrentQuestion().answers.map((answer, index) => ({
        index,
        answer
      }))
    };
  }

  onAnswerSelected(selectedAnswerIndex) {
    this.quiz.selectAnswer(this.quiz.getCurrentQuestion().answers[selectedAnswerIndex]);

    if (!this.quiz.hasNextQuestion()) {
      return this.renderFinish();
    }

    return this.renderNextButton();
  }

  renderNextButton() {
    return {
      type: 'nextButton'
    };
  }

  renderFinish() {
    return {
      type: 'finish',
      payload: {
        score: this.quiz.score,
        total: this.quiz.questions.length
      }
    };
  }
}

module.exports = QuizRenderer;
