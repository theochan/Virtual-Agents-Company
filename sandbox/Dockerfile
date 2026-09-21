ARG PYTHON_BASE=python@sha256:2c941e860699f878900b0edc2403613c234d4b32eda3cc9fa7036991a2a63c4a
FROM ${PYTHON_BASE}
COPY requirements.lock /requirements.lock
RUN pip install --no-cache-dir -r /requirements.lock
COPY runner.py /runner.py
USER 65534:65534
WORKDIR /workspace
ENTRYPOINT ["python", "/runner.py"]
